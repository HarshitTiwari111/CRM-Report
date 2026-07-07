const cron = require('node-cron');
const Task = require('../models/Task');
const { createNotification } = require('./notify');

/**
 * Runs once a day and creates a reminder Notification for every task whose
 * expectedCompletion falls within the next 24 hours and is not yet completed.
 */
const runDeadlineReminderJob = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueSoonTasks = await Task.find({
    status: { $in: ['pending', 'in-progress'] },
    expectedCompletion: { $gte: now, $lte: in24h },
  }).select('title assignedTo expectedCompletion');

  await Promise.all(
    dueSoonTasks.map((task) =>
      createNotification({
        user: task.assignedTo,
        title: 'Task deadline approaching',
        message: `Task "${task.title}" is due on ${new Date(task.expectedCompletion).toLocaleString()}`,
        type: 'reminder',
        link: `/tasks/${task._id}`,
        relatedId: task._id,
      })
    )
  );

  if (dueSoonTasks.length > 0) {
    console.log(`Deadline reminder job: created ${dueSoonTasks.length} notification(s).`);
  }
};

const scheduleDeadlineReminderJob = () => {
  // Runs every day at 08:00 server time
  cron.schedule('0 8 * * *', () => {
    runDeadlineReminderJob().catch((err) => {
      console.error('Deadline reminder job failed:', err.message);
    });
  });
};

module.exports = { scheduleDeadlineReminderJob, runDeadlineReminderJob };
