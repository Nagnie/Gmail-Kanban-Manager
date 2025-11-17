import axios from "axios";
import { type Email } from "./types";

type RawPerson = { name?: string; email?: string };
type RawAttachment = { name?: string; fileName?: string; size?: string };
type RawEmail = {
    id?: number | string;
    mailboxId?: string;
    from?: RawPerson;
    to?: RawPerson[];
    cc?: RawPerson[] | string;
    subject?: string;
    preview?: string;
    body?: string;
    bodyHtml?: string;
    bodyText?: string;
    timestamp?: string;
    isRead?: boolean;
    isStarred?: boolean;
    attachments?: RawAttachment[];
};

const api = axios.create({
    baseURL: "/api",
});

function htmlToText(html: string | undefined) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
}

function mapRawToEmail(r: RawEmail): Email {
    const toList = (r.to || []).map((t) => `${t?.name ?? ""} <${t?.email ?? ""}>`).join(", ");
    const ccValue = Array.isArray(r.cc)
        ? (r.cc as RawPerson[])
              .map((t) => (t?.name && t?.email ? `${t.name} <${t.email}>` : ""))
              .filter(Boolean)
              .join(", ")
        : typeof r.cc === "string"
        ? r.cc
        : undefined;

    return {
        id: Number(r.id),
        from: `${r.from?.name ?? ""} <${r.from?.email ?? ""}>`,
        to: toList,
        cc: ccValue || undefined,
        subject: r.subject || "",
        preview: r.preview || "",
        body: htmlToText(r.bodyHtml) || r.body || r.bodyText || "",
        bodyHtml: r.bodyHtml || undefined,
        timestamp: r.timestamp || "",
        isRead: !!r.isRead,
        isStarred: !!r.isStarred,
        attachments:
            r.attachments?.map((a) => ({
                name: a.fileName || a.name || "file",
                size: a.size || "",
            })) || undefined,
    } as Email;
}

export async function getMailboxes(): Promise<
    Array<{ id: string; name: string; unreadCount?: number }>
> {
    const res = await api.get<Array<{ id: string; name: string; unreadCount?: number }>>(
        "/mailboxes"
    );
    return res.data;
}

export async function getMailboxEmails(
    mailboxId: string,
    opts?: { page?: number; pageSize?: number; q?: string }
): Promise<{ items: Email[]; total: number }> {
    const params: Record<string, string | number | undefined> = {};
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    params._page = page;
    params._limit = pageSize;
    if (opts?.q) params.q = opts.q;

    const res = await api.get<RawEmail[]>(`/mailboxes/${mailboxId}/emails`, { params });
    const raw = res.data as RawEmail[];
    const items: Email[] = raw.map(mapRawToEmail);
    const total = parseInt(res.headers["x-total-count"] || String(items.length), 10);
    return { items, total };
}

export async function getEmailById(id: number): Promise<Email> {
    const res = await api.get<RawEmail>(`/emails/${id}`);
    const r = res.data as RawEmail;
    return mapRawToEmail(r);
}

export async function getAllEmails(opts?: {
    page?: number;
    pageSize?: number;
    q?: string;
}): Promise<{ items: Email[]; total: number }> {
    const params: Record<string, string | number | undefined> = {};
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 100;
    params._page = page;
    params._limit = pageSize;
    if (opts?.q) params.q = opts.q;

    const res = await api.get<RawEmail[]>(`/emails`, { params });
    const raw = res.data as RawEmail[];
    const items: Email[] = raw.map(mapRawToEmail);
    const total = parseInt(res.headers["x-total-count"] || String(items.length), 10);
    return { items, total };
}

export default {
    getMailboxes,
    getMailboxEmails,
    getEmailById,
    getAllEmails,
};
