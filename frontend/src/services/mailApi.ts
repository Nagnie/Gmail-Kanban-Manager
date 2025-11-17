import axios from "axios";
import { type Email } from "./types";

const api = axios.create({
    baseURL: "/api",
});

function htmlToText(html: string | undefined) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
}

export async function getMailboxes(): Promise<
    Array<{ id: string; name: string; unreadCount?: number }>
> {
    const res = await api.get("/mailboxes");
    return res.data;
}

export async function getMailboxEmails(
    mailboxId: string,
    opts?: { page?: number; pageSize?: number; q?: string }
): Promise<{ items: Email[]; total: number }> {
    const params: Record<string, any> = {};
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    params._page = page;
    params._limit = pageSize;
    if (opts?.q) params.q = opts.q;

    const res = await api.get(`/mailboxes/${mailboxId}/emails`, { params });
    const raw: any[] = res.data;
    const items: Email[] = raw.map((r) => ({
        id: Number(r.id),
        from: `${r.from?.name ?? ""} <${r.from?.email ?? ""}>`,
        to: (r.to || []).map((t: any) => `${t.name} <${t.email}>`).join(", "),
        cc: r.cc || undefined,
        subject: r.subject,
        preview: r.preview,
        body: htmlToText(r.bodyHtml) || r.bodyText || "",
        timestamp: r.timestamp,
        isRead: !!r.isRead,
        isStarred: !!r.isStarred,
        attachments:
            r.attachments?.map((a: any) => ({
                name: a.fileName || a.name || "file",
                size: a.size || "",
            })) || undefined,
    }));
    const total = parseInt(res.headers["x-total-count"] || String(items.length), 10);
    return { items, total };
}

export async function getEmailById(id: number): Promise<Email> {
    const res = await api.get(`/emails/${id}`);
    const r: any = res.data;
    const email: Email = {
        id: Number(r.id),
        from: `${r.from?.name ?? ""} <${r.from?.email ?? ""}>`,
        to: (r.to || []).map((t: any) => `${t.name} <${t.email}>`).join(", "),
        cc: r.cc || undefined,
        subject: r.subject,
        preview: r.preview,
        body: htmlToText(r.bodyHtml) || r.bodyText || "",
        timestamp: r.timestamp,
        isRead: !!r.isRead,
        isStarred: !!r.isStarred,
        attachments:
            r.attachments?.map((a: any) => ({
                name: a.fileName || a.name || "file",
                size: a.size || "",
            })) || undefined,
    };
    return email;
}

export async function getAllEmails(opts?: {
    page?: number;
    pageSize?: number;
    q?: string;
}): Promise<{ items: Email[]; total: number }> {
    const params: Record<string, any> = {};
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 100;
    params._page = page;
    params._limit = pageSize;
    if (opts?.q) params.q = opts.q;

    const res = await api.get(`/emails`, { params });
    const raw: any[] = res.data;
    const items: Email[] = raw.map((r) => ({
        id: Number(r.id),
        from: `${r.from?.name ?? ""} <${r.from?.email ?? ""}>`,
        to: (r.to || []).map((t: any) => `${t.name} <${t.email}>`).join(", "),
        cc: r.cc || undefined,
        subject: r.subject,
        preview: r.preview,
        body: htmlToText(r.bodyHtml) || r.bodyText || "",
        timestamp: r.timestamp,
        isRead: !!r.isRead,
        isStarred: !!r.isStarred,
        attachments:
            r.attachments?.map((a: any) => ({
                name: a.fileName || a.name || "file",
                size: a.size || "",
            })) || undefined,
    }));
    const total = parseInt(res.headers["x-total-count"] || String(items.length), 10);
    return { items, total };
}

export default {
    getMailboxes,
    getMailboxEmails,
    getEmailById,
    getAllEmails,
};
