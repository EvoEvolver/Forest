import Queue from 'bull';
import {EmailService} from './emailService';
import {Issue} from '../types/Issue';

// Email job data interfaces
interface AssignmentEmailJob {
    type: 'assignment';
    assigneeEmail: string;
    assigneeName: string;
    issue: Issue;
    context: 'create' | 'update';
}

interface DeadlineReminderJob {
    type: 'deadline';
    assigneeEmail: string;
    assigneeName: string;
    issue: Issue;
}

type EmailJob = AssignmentEmailJob | DeadlineReminderJob;

export class EmailQueue {
    private queue: Queue.Queue<EmailJob>;
    private emailService: EmailService;

    constructor() {
        // Create Bull queue with Redis connection
        this.queue = new Queue('email notifications', {
            redis: process.env.REDIS_URL,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50, // Keep last 50 failed jobs
            },
        });

        this.emailService = new EmailService();
        this.setupProcessor();
    }

    private setupProcessor() {
        // Process email jobs
        this.queue.process(async (job) => {
            const {data} = job;

            try {
                if (data.type === 'assignment') {
                    await this.emailService.sendAssignmentNotification(
                        data.assigneeEmail,
                        data.assigneeName,
                        data.issue
                    );
                    console.log(`Assignment email sent to ${data.assigneeEmail} for issue: ${data.issue.title}`);
                } else if (data.type === 'deadline') {
                    await this.emailService.sendDeadlineReminder(
                        data.assigneeEmail,
                        data.assigneeName,
                        data.issue
                    );
                    console.log(`Deadline reminder sent to ${data.assigneeEmail} for issue: ${data.issue.title}`);
                }
            } catch (error) {
                console.error(`Failed to send ${data.type} email to ${data.assigneeEmail}:`, error);
                throw error; // Re-throw to trigger retry
            }
        });

        // Event listeners for monitoring
        this.queue.on('completed', (job) => {
            console.log(`Email job ${job.id} completed`);
        });

        this.queue.on('failed', (job, err) => {
            console.error(`Email job ${job.id} failed:`, err.message);
        });

        this.queue.on('stalled', (job) => {
            console.warn(`Email job ${job.id} stalled`);
        });
    }

    // Add assignment notification to queue
    async queueAssignmentNotification(
        assigneeEmail: string,
        assigneeName: string,
        issue: Issue,
        context: 'create' | 'update' = 'create'
    ) {
        const jobData: AssignmentEmailJob = {
            type: 'assignment',
            assigneeEmail,
            assigneeName,
            issue,
            context,
        };

        await this.queue.add(jobData, {
            priority: context === 'create' ? 1 : 2, // Higher priority for new assignments
            delay: 1000, // Small delay to batch similar operations
        });

        console.log(`Queued ${context} assignment email for ${assigneeEmail}`);
    }

    // Add deadline reminder to queue
    async queueDeadlineReminder(
        assigneeEmail: string,
        assigneeName: string,
        issue: Issue
    ) {
        const jobData: DeadlineReminderJob = {
            type: 'deadline',
            assigneeEmail,
            assigneeName,
            issue,
        };

        await this.queue.add(jobData, {
            priority: 0, // Highest priority for deadline reminders
        });

        console.log(`Queued deadline reminder for ${assigneeEmail}`);
    }

    // Get queue statistics
    async getStats() {
        const waiting = await this.queue.getWaiting();
        const active = await this.queue.getActive();
        const completed = await this.queue.getCompleted();
        const failed = await this.queue.getFailed();

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
        };
    }

    // Graceful shutdown
    async close() {
        await this.queue.close();
    }
}

// Export singleton instance
export const emailQueue = new EmailQueue(); 