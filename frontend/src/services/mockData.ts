import { type Email } from './types';

export const mockEmails: Record<string, Email[]> = {
    inbox: [
        {
            id: 1,
            from: 'Alice Johnson <alice@company.com>',
            to: 'me@email.com',
            subject: 'Q4 Sales Report Review',
            preview: 'Hi, I wanted to share the preliminary Q4 sales figures with you...',
            body: 'Hi,\n\nI wanted to share the preliminary Q4 sales figures with you. We\'ve seen a 23% increase compared to Q3, which is excellent news for the team.\n\nPlease review the attached report and let me know if you have any questions.\n\nBest regards,\nAlice',
            timestamp: '2 hours ago',
            isRead: false,
            isStarred: true,
            attachments: [{ name: 'Q4_Sales_Report.pdf', size: '2.4 MB' }]
        },
        {
            id: 2,
            from: 'Bob Smith <bob@partner.com>',
            to: 'me@email.com',
            cc: 'team@company.com',
            subject: 'Meeting Reschedule Request',
            preview: 'Hope this email finds you well. I need to reschedule our meeting...',
            body: 'Hope this email finds you well.\n\nI need to reschedule our meeting scheduled for tomorrow. Would Thursday at 2 PM work for you instead?\n\nLooking forward to hearing from you.\n\nBob',
            timestamp: '5 hours ago',
            isRead: true,
            isStarred: false
        },
        {
            id: 3,
            from: 'Newsletter <newsletter@techblog.com>',
            to: 'me@email.com',
            subject: 'Weekly Tech Digest: AI Advances',
            preview: 'Your weekly roundup of the most important tech news and insights...',
            body: 'Your weekly roundup of the most important tech news and insights.\n\nThis week:\n- Major AI breakthroughs in healthcare\n- New programming languages gaining traction\n- Cloud computing cost optimization strategies\n\nRead more on our website.',
            timestamp: 'Yesterday',
            isRead: false,
            isStarred: true
        },
        {
            id: 4,
            from: 'HR Department <hr@company.com>',
            to: 'all@company.com',
            subject: 'Updated Employee Benefits Information',
            preview: 'We are pleased to announce updates to our employee benefits package...',
            body: 'We are pleased to announce updates to our employee benefits package for 2025.\n\nKey changes include:\n- Enhanced health insurance coverage\n- Increased 401(k) matching\n- Additional PTO days\n\nPlease review the attached documentation.\n\nHR Team',
            timestamp: '2 days ago',
            isRead: true,
            isStarred: false,
            attachments: [{ name: 'Benefits_2025.pdf', size: '1.8 MB' }]
        }
    ],
    starred: [],
    sent: [
        {
            id: 5,
            from: 'me@email.com',
            to: 'client@business.com',
            subject: 'Project Proposal - Phase 2',
            preview: 'Thank you for your continued partnership. Attached is our proposal...',
            body: 'Thank you for your continued partnership.\n\nAttached is our proposal for Phase 2 of the project. We\'ve incorporated all the feedback from our last meeting.\n\nPlease let me know if you need any clarifications.\n\nBest regards',
            timestamp: '3 days ago',
            isRead: true,
            isStarred: false
        }
    ],
    drafts: [],
    archive: [],
    trash: []
};