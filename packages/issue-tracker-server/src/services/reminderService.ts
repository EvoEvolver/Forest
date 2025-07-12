import cron from 'node-cron';
import { getIssueModel } from '../models/Issue';
import { emailQueue } from './emailQueue';

export class ReminderService {
  
  startDailyReminders() {
    // 9 AM every day
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily deadline reminders...');
      await this.sendDeadlineReminders();
    }, {
      timezone: "Asia/Shanghai" // 设置时区
    });
    
    console.log('Daily reminder cron job started (9:00 AM Asia/Shanghai)');
  }
  
  private async sendDeadlineReminders() {
    try {
      const Issue = await getIssueModel();
      
      // Find issues due today and tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      dayAfterTomorrow.setHours(0, 0, 0, 0);
      
      // Use optimized index query
      const upcomingIssues = await Issue.find({
        dueDate: {
          $gte: today,
          $lt: dayAfterTomorrow
        },
        status: { $in: ['open', 'in_progress'] },
        'assignees.0': { $exists: true } 
      }).lean(); 
      
      console.log(`Found ${upcomingIssues.length} issues with upcoming deadlines`);
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      for (const issue of upcomingIssues) {
        for (const assignee of issue.assignees) {
          try {
            // Obtain user email information
            const userEmail = await this.getUserEmail(assignee.userId);
            const userName = assignee.username || assignee.userId;
            
            if (userEmail) {
              // Convert lean document to Issue type for email service
              const issueForEmail = {
                ...issue,
                _id: issue._id.toString()
              } as any;
              await emailQueue.queueDeadlineReminder(userEmail, userName, issueForEmail);
              emailsSent++;
              console.log(`Queued deadline reminder for ${userEmail} for issue: ${issue.title}`);
            } else {
              console.warn(`No email found for user ${assignee.userId}`);
            }
          } catch (error) {
            emailsFailed++;
            console.error(`Failed to send reminder to ${assignee.userId}:`, error);
          }
        }
      }
      
      console.log(`Deadline reminders completed: ${emailsSent} sent, ${emailsFailed} failed`);
    } catch (error) {
      console.error('Failed to send deadline reminders:', error);
    }
  }
  
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      // Call user service to get email
      const response = await fetch(`${process.env.USER_SERVICE_URL || 'http://localhost:29999'}/api/user/metadata/${userId}`);
      
      if (response.ok) {
        const userData = await response.json();
        return userData.email || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch email for user ${userId}:`, error);
      return null;
    }
  }
  
  // Manually trigger reminders (for testing)
  async triggerRemindersNow() {
    console.log('Manually triggering deadline reminders...');
    await this.sendDeadlineReminders();
  }
} 