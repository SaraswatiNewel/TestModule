var express = require('express');
var router = express.Router();
var connect = require('./../../Data/Connect');
var datamodel = require('./../../Data/DataModel');
var dataaccess = require('./../../Data/DataAccess');
var dataconn = require('./../../Data/DataConnection');
var connect = require("../../Connect");
const sequelize = require('sequelize');
const Connect = require('./../../Data/Connect');
const { Op } = require('sequelize');
const moment = require('moment');

var routes = function () {

  router.route('/stp_UserDashboardDetails')
    .get(async function (req, res) {

      const tbl_TaskManagement = datamodel.tbl_TaskManagement();
      const tbl_SubTask = datamodel.tbl_SubTask();
      const UserGroup = datamodel.tbl_UserGroup();
      const UserProject = datamodel.tbl_UserProject();
      const User = datamodel.tbl_users();
      const tbl_ProjectMaster = datamodel.tbl_ProjectMaster();
      const tbl_ScheduledTask = datamodel.tbl_ScheduledTask();
      const today = moment(new Date()).format('YYYY-MM-DD');;
      const userId = 1; 
       let EntireData = [];
      const projectCount = await tbl_TaskManagement.count({
        distinct: true,
        col: 'projectId',
        where: {
          [Op.or]: [
            { UserId: userId },
            { GroupId: { [Op.in]: UserGroup.findAll({ attributes: ['GroupID'], where: { UserID: userId } }) } },
            { projectId: { [Op.in]: UserProject.findAll({ attributes: ['ProjectID'], where: { UserID: userId, IsActive: true } }) } }
          ]
        }
      });


      console.log('projectCount', projectCount);

    EntireData.push({ tbl_TaskManagementProjectCount: projectCount });
      const subTaskCount = await tbl_TaskManagement.count({
        col: 'SubtaskId',
        where: {
          [Op.or]: [
            { UserId: userId },
            { GroupId: { [Op.in]: UserGroup.findAll({ attributes: ['GroupID'], where: { UserID: userId } }) } },
            { projectId: { [Op.in]: UserProject.findAll({ attributes: ['ProjectID'], where: { UserID: userId, IsActive: true } }) } }
          ]
        }
      });

      console.log('subTaskCount', subTaskCount);
      EntireData.push({ tbl_TaskManagementsubTaskCount: subTaskCount });

      const breachedTaskCount = await tbl_TaskManagement.count({
        include: [
          { model: tbl_SubTask, where: { IsActive: true } }
        ],
        where: {
          [Op.or]: [
            {
              [Op.and]: [
                sequelize.fn('concat', sequelize.fn('replace', sequelize.fn('convert', sequelize.STRING, sequelize.col('ExpectedEndDate'), 106), ' ', '-'), ' ', sequelize.fn('stuff', sequelize.fn('right', sequelize.fn('convert', sequelize.STRING, sequelize.col('ExpectedEndTime'), 100), 7), 6, 0, ' '), '<=', today),
                { Status: { [Op.notIn]: [3, 5] } }
              ]
            },
            {
              [Op.and]: [
                sequelize.fn('concat', sequelize.fn('replace', sequelize.fn('convert', sequelize.STRING, sequelize.col('ExpectedEndDate'), 106), ' ', '-'), ' ', sequelize.fn('stuff', sequelize.fn('right', sequelize.fn('convert', sequelize.STRING, sequelize.col('ExpectedEndTime'), 100), 7), 6, 0, ' '), '<=', sequelize.col('UpdatedOn')),
                { Status: 3 },
                sequelize.where(sequelize.fn('convert', sequelize.STRING, sequelize.col('UpdatedOn'), 103), '=', sequelize.fn('convert', sequelize.STRING, today, 103))
              ]
            }
          ],
          [Op.or]: [
            { UserId: userId },
            { GroupId: { [Op.in]: UserGroup.findAll({ attributes: ['GroupID'], where: { UserID: userId } }) } },
            { projectId: { [Op.in]: UserProject.findAll({ attributes: ['ProjectID'], where: { UserID: userId, IsActive: true } }) } }
          ]
        }
      });

      console.log('breachedTaskCount', breachedTaskCount);

      EntireData.push({ tbl_TaskManagementbreachedTaskCount: breachedTaskCount });
      //   const today = moment().format('DD/MM/YYYY');



      const UserTotalUProjectCount = await tbl_ScheduledTask.count({
        distinct: true,
        col: 'ProjectId',
        include: [
          {
            model: User,
            attributes: ['id'],
            where: {
              id: userId,
            },
          },
          {
            model: UserGroup,
            where: {
              [Op.or]: [
                { UserID: userId },
                { GroupID: { [Op.in]: UserGroup.sequelize.literal(`(SELECT "GroupID" FROM "tbl_UserGroup" WHERE "UserID" = ${userId})`) } },
              ],
            },
          },
          {
            model: UserProject,
            where: {
              "UserID": userId,
              "IsActive": true,
            },
          },
        ],
        where: {
          "IsActive": true,
          [Op.or]: [
            { UserId: userId },
            { GroupId: { [Op.in]: UserGroup.sequelize.literal(`(SELECT "GroupID" FROM "tbl_UserGroup" WHERE "UserID" = ${userId})`) } },
            { ProjectId: { [Op.in]: UserProject.sequelize.literal(`(SELECT "ProjectID" FROM "tbl_UserProject" WHERE "UserID" = ${userId} AND "IsActive" = true)`) } },
          ],
        },
      });
      console.log("UserTotalUProjectCount",UserTotalUProjectCount);
      EntireData.push({ tbl_TaskManagementUserTotalUProjectCount: UserTotalUProjectCount });

      const result = await tbl_TaskManagement.findAll({
        attributes: [
          'projectId',
          [sequelize.fn('COUNT', sequelize.col('SubtaskId')), 'SubTaskCount'],
          [
            sequelize.fn(
              'COALESCE',
              sequelize.fn(
                'COUNT',
                sequelize.literal(
                  `(CASE WHEN "tbl_TaskManagement"."Status" = 1  AND CAST("tbl_TaskManagement"."StartDate" AS DATE) = CAST('${today}' AS DATE) THEN "tbl_TaskManagement"."SubtaskId" ELSE NULL END)`
                )
              ),
              0
            ),
            'Opened'
          ],
          [
            sequelize.fn(
              'COALESCE',
              sequelize.fn(
                'COUNT',
                sequelize.literal(
                  `(CASE WHEN "tbl_TaskManagement"."Status" = 2 AND CAST("tbl_TaskManagement"."StartDate" AS DATE) = CAST('${today}' AS DATE) THEN "tbl_TaskManagement"."SubtaskId" ELSE NULL END)`
                )
              ),
              0
            ),
            'wip'
          ],
          [
            sequelize.fn(
              'COALESCE',
              sequelize.fn(
                'COUNT',
                sequelize.literal(
                  `(CASE WHEN "tbl_TaskManagement"."Status" = 3 AND  CAST("tbl_TaskManagement"."StartDate" AS DATE) = CAST('${today}' AS DATE) THEN "tbl_TaskManagement"."SubtaskId" ELSE NULL END)`
                )
              ),
              0
            ),
            'completed'
          ]
        ],
        include: [
          {
            model: tbl_ProjectMaster,
            where: { IsActive: true },
            attributes: ['ProjectName']
          }
        ],
        where: {
          [Op.or]: [
            { UserId: userId },
            { GroupId: { [Op.in]: sequelize.literal(`(SELECT "GroupID" FROM "tbl_UserGroup" WHERE "UserID" = ${userId})`) } },
            {
              projectId: {
                [Op.in]: sequelize.literal(
                  `(SELECT "ProjectID" FROM "tbl_UserProject" WHERE "UserID" = ${userId} AND "IsActive" = true)`
                )
              }
            }
          ],

          StartDate: { [Op.gte]: sequelize.fn('CAST', sequelize.literal(`'${today}' AS DATE`)) }
        },
        group: ['tbl_ProjectMaster"."ProjectId"', 'tbl_TaskManagement.TaskManageId']
      });


      if (result != null) {
        EntireData.push({ tbl_TaskManagementresult: result });
                    res.status(200).json({ Success: true, Message: 'tbl_TaskManagement Access sucessfully', Data: EntireData });
                }
    
                else {
                  dataconn.errorlogger('stp_UserDashboardDetails', 'tbl_TaskManagement', err);
                  res.status(200).json({ Success: false, Message: 'User has no access of tbl_TaskManagement', Data: null });
                  
              }
         

    });






  return router;
};


module.exports = routes;