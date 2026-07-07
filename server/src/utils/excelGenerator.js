const ExcelJS = require('exceljs');

const COLUMNS = [
  { header: 'Title', key: 'title', width: 30 },
  { header: 'Employee', key: 'employee', width: 20 },
  { header: 'Project', key: 'project', width: 20 },
  { header: 'Client', key: 'client', width: 20 },
  { header: 'Department', key: 'department', width: 18 },
  { header: 'Task Date', key: 'taskDate', width: 14 },
  { header: 'Start Time', key: 'startTime', width: 18 },
  { header: 'End Time', key: 'endTime', width: 18 },
  { header: 'Total Hours', key: 'totalHours', width: 12 },
  { header: 'Priority', key: 'priority', width: 12 },
  { header: 'Task Type', key: 'taskType', width: 16 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Remarks', key: 'remarks', width: 30 },
];

const toRow = (task) => ({
  title: task.title,
  employee: task.assignedTo?.name || '-',
  project: task.project?.name || '-',
  client: task.client?.name || '-',
  department: task.department?.name || '-',
  taskDate: task.taskDate ? new Date(task.taskDate).toLocaleDateString() : '-',
  startTime: task.startTime ? new Date(task.startTime).toLocaleString() : '-',
  endTime: task.endTime ? new Date(task.endTime).toLocaleString() : '-',
  totalHours: task.totalHours || 0,
  priority: task.priority,
  taskType: task.taskType,
  status: task.status,
  remarks: task.remarks || '',
});

const generateTaskExcel = async (res, tasks) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Task Report');

  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  tasks.forEach((task) => sheet.addRow(toRow(task)));

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="task-report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
};

const generateTaskCSV = async (res, tasks) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Task Report');

  sheet.columns = COLUMNS;
  tasks.forEach((task) => sheet.addRow(toRow(task)));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="task-report.csv"');

  const buffer = await workbook.csv.writeBuffer();
  res.send(buffer);
};

module.exports = { generateTaskExcel, generateTaskCSV };
