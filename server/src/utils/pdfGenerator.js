const PDFDocument = require('pdfkit');

/**
 * Streams a task report PDF directly to the given response.
 * @param {import('express').Response} res
 * @param {Array<Object>} tasks - populated task documents
 * @param {Object} meta - { title, generatedBy, filters }
 */
const generateTaskReportPDF = (res, tasks, meta = {}) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="task-report.pdf"');

  doc.pipe(res);

  const companyName = meta.companyName || 'My Company';
  const generatedDate = new Date().toLocaleString();

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(companyName, { align: 'left' })
    .fontSize(14)
    .text('Task Report', { align: 'left' })
    .moveDown(0.3)
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#555')
    .text(`Generated: ${generatedDate}`)
    .text(`Report type: ${meta.type || 'employee'}`)
    .fillColor('#000')
    .moveDown(0.5);

  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const columns = [
    { key: 'title', label: 'Title', width: 140 },
    { key: 'project', label: 'Project', width: 90 },
    { key: 'taskDate', label: 'Date', width: 70 },
    { key: 'totalHours', label: 'Hours', width: 50 },
    { key: 'status', label: 'Status', width: 80 },
  ];

  const drawRow = (y, rowData, isHeader = false) => {
    let x = 40;
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    columns.forEach((col) => {
      doc.text(String(rowData[col.key] ?? ''), x, y, { width: col.width, ellipsis: true });
      x += col.width;
    });
  };

  let y = tableTop;
  drawRow(y, columns.reduce((acc, c) => ({ ...acc, [c.key]: c.label }), {}), true);
  y += 18;
  doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#ccc').stroke();

  let totalHours = 0;
  let completedCount = 0;
  let pendingCount = 0;

  tasks.forEach((task) => {
    if (y > 740) {
      doc.addPage();
      y = 40;
    }

    const projectName = task.project?.name || '-';
    const dateStr = task.taskDate ? new Date(task.taskDate).toLocaleDateString() : '-';
    const hours = task.totalHours || 0;
    totalHours += hours;
    if (task.status === 'completed') completedCount += 1;
    if (task.status === 'pending' || task.status === 'in-progress') pendingCount += 1;

    drawRow(y, {
      title: task.title,
      project: projectName,
      taskDate: dateStr,
      totalHours: hours,
      status: task.status,
    });

    y += 18;
  });

  y += 10;
  if (y > 700) {
    doc.addPage();
    y = 40;
  }

  doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
  y += 12;

  doc.font('Helvetica-Bold').fontSize(11).text('Summary', 40, y);
  y += 18;
  doc.font('Helvetica').fontSize(10);
  doc.text(`Total tasks: ${tasks.length}`, 40, y);
  y += 14;
  doc.text(`Total hours worked: ${totalHours.toFixed(2)}`, 40, y);
  y += 14;
  doc.text(`Completed: ${completedCount}`, 40, y);
  y += 14;
  doc.text(`Pending / In-progress: ${pendingCount}`, 40, y);
  y += 40;

  if (y > 700) {
    doc.addPage();
    y = 40;
  }
  doc.text('___________________________', 40, y);
  doc.text('Signature', 40, y + 14);

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor('#888')
      .text(`Page ${i + 1} of ${range.count}`, 40, 800, { align: 'right', width: 515 });
  }

  doc.end();
};

module.exports = { generateTaskReportPDF };
