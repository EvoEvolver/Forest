import cron from 'node-cron';
import {getIssueModel} from '../models/Issue';
import {EmailService} from './emailService';

export class ReminderService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

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
                status: {$in: ['open', 'in_progress', 'in_review']},
                'assignees.0': {$exists: true}
            }).lean();

            console.log(`Found ${upcomingIssues.length} issues with upcoming deadlines`);

            let emailsSent = 0;
            let emailsFailed = 0;

            for (const issue of upcomingIssues) {
                for (const assignee of issue.assignees) {
                    try {
                        // Obtain user email information
                        const {email: userEmail, username: userName} = await this.getUserEmail(assignee.userId);

                        if (userEmail) {
                            // Convert lean document to Issue type for email service
                            const issueForEmail = {
                                ...issue,
                                _id: issue._id.toString()
                            } as any;
                            await this.emailService.sendDeadlineReminder(userEmail, userName, issueForEmail);
                            emailsSent++;
                            console.log(`Sent deadline reminder to ${userEmail} for issue: ${issue.title}`);
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

    private async getUserEmail(userId: string): Promise<{ email: string | null, username: string }> {
        try {
            // Call user service to get email
            const response = await fetch(`${process.env.USER_SERVICE_URL || 'http://localhost:29999'}/api/user/metadata/${userId}`);

            if (response.ok) {
                const userData = await response.json();
                // Match frontend priority order: display_name > name > user_name > email prefix > fallback to id
                const username = userData.display_name || userData.name || userData.user_name || userData.email?.split('@')[0] || userId;

                return {
                    email: userData.email || null,
                    username: username
                };
            }

            return {email: null, username: userId};
        } catch (error) {
            console.error(`Failed to fetch email for user ${userId}:`, error);
            return {email: null, username: userId};
        }
    }

    // Manually trigger reminders (for testing)
    async triggerRemindersNow() {
        console.log('Manually triggering deadline reminders...');
        await this.sendDeadlineReminders();
    }
} 