import axios from 'axios';
import {Issue} from '../types/Issue';

export class EmailService {
    private smtp2goApiKey = process.env.SMTP2GO_API_KEY;
    private fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

    constructor() {
        if (!this.smtp2goApiKey) {
            console.warn('SMTP2GO_API_KEY not configured - email notifications disabled');
        }
    }

    async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string) {
        if (!this.smtp2goApiKey) {
            console.log('Email service not configured, skipping email to:', to);
            return;
        }

        try {
            const response = await axios.post('https://api.smtp2go.com/v3/email/send', {
                api_key: this.smtp2goApiKey,
                to: [to],
                sender: this.fromEmail,
                subject: subject,
                html_body: htmlContent,
                text_body: textContent || this.stripHtml(htmlContent)
            });

            console.log(`Email sent successfully to ${to}:`, response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to send email to', to, ':', error);
            throw error;
        }
    }

    async sendAssignmentNotification(assigneeEmail: string, assigneeName: string, issue: Issue) {
        const subject = `🎯 You've been assigned to: ${issue.title}`;
        const htmlContent = this.generateAssignmentEmailTemplate(assigneeName, issue);

        return this.sendEmail(assigneeEmail, subject, htmlContent);
    }

    async sendDeadlineReminder(assigneeEmail: string, assigneeName: string, issue: Issue) {
        const dueDate = new Date(issue.dueDate!);
        const isToday = dueDate.toDateString() === new Date().toDateString();
        const isTomorrow = dueDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

        const urgencyText = isToday ? 'due TODAY' : isTomorrow ? 'due TOMORROW' : 'due soon';
        const subject = `⏰ Reminder: "${issue.title}" is ${urgencyText}`;
        const htmlContent = this.generateDeadlineReminderTemplate(assigneeName, issue, urgencyText);

        return this.sendEmail(assigneeEmail, subject, htmlContent);
    }

    private generateAssignmentEmailTemplate(assigneeName: string, issue: Issue): string {
        const priorityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            urgent: '🔴'
        };

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .priority-${issue.priority} { color: ${this.getPriorityColor(issue.priority)}; font-weight: bold; }
          .button { 
            background: #1976d2 !important; 
            color: white !important; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block; 
            margin: 20px 0;
            border: none;
          }
          .button:hover { background: #1565c0 !important; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .issue-details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🎯 New Issue Assignment</h2>
          <p>Hi ${assigneeName}, you've been assigned to a new issue!</p>
        </div>
        
        <p><strong>Title:</strong> ${issue.title}</p>
        
        <p><strong>Priority:</strong> ${priorityEmoji[issue.priority || 'medium']} <span class="priority-${issue.priority}">${(issue.priority || 'medium').toUpperCase()}</span></p>
        
        ${issue.dueDate ? `<p><strong>Due Date:</strong> ${new Date(issue.dueDate).toLocaleDateString()}</p>` : ''}
        
        <p><strong>Description:</strong></p>
        <div class="issue-details">
          ${issue.description || 'No description provided.'}
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/issues?treeId=${issue.treeId}" class="button" style="background: #1976d2 !important; color: white !important;">
            View Issue
          </a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Issue Tracker.</p>
          <p>Tree ID: ${issue.treeId}</p>
        </div>
      </body>
      </html>
    `;
    }

    private generateDeadlineReminderTemplate(assigneeName: string, issue: Issue, urgencyText: string): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 1px solid #ffeaa7; }
          .urgent { color: #d32f2f; font-weight: bold; }
          .button { 
            background: #d32f2f !important; 
            color: white !important; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block; 
            margin: 20px 0;
            border: none;
          }
          .button:hover { background: #b71c1c !important; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .issue-details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>⏰ Deadline Reminder</h2>
          <p>Hi ${assigneeName}, this issue is <span class="urgent">${urgencyText}</span>!</p>
        </div>
        
        <p><strong>Title:</strong> ${issue.title}</p>
        
        <p><strong>Due Date:</strong> <span class="urgent">${new Date(issue.dueDate!).toLocaleDateString()}</span></p>
        <p><strong>Priority:</strong> ${(issue.priority || 'medium').toUpperCase()}</p>
        <p><strong>Status:</strong> ${issue.status.replace('_', ' ').toUpperCase()}</p>
        
        <p><strong>Description:</strong></p>
        <div class="issue-details">
          ${issue.description || 'No description provided.'}
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/issues?treeId=${issue.treeId}" class="button" style="background: #d32f2f !important; color: white !important;">
            View Issue Now
          </a>
        </div>
        
        <div class="footer">
          <p>This is an automated deadline reminder from Issue Tracker.</p>
          <p>Tree ID: ${issue.treeId}</p>
        </div>
      </body>
      </html>
    `;
    }

    private getPriorityColor(priority: string): string {
        switch (priority) {
            case 'low':
                return '#2e7d32';
            case 'medium':
                return '#ed6c02';
            case 'high':
                return '#d32f2f';
            case 'urgent':
                return '#d32f2f';
            default:
                return '#ed6c02';
        }
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
} 