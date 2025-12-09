export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildQuotedText(
  originalBody: string,
  from: string,
  date: string,
): string {
  const lines = ['', `On ${date}, ${from} wrote:`, ''];

  // Add > prefix to each line
  const quotedLines = originalBody.split('\n').map((line) => `> ${line}`);
  lines.push(...quotedLines);

  return lines.join('\n');
}

export function buildQuotedHtml(
  originalBody: string,
  from: string,
  date: string,
): string {
  return `
      <div class="gmail_quote">
        <div class="gmail_attr">
          On ${escapeHtml(date)}, ${escapeHtml(from)} wrote:
        </div>
        <blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">
          ${originalBody}
        </blockquote>
      </div>
    `;
}

export function buildReplySubject(originalSubject: string): string {
  const subject = originalSubject?.trim() || 'No Subject';

  // Check if already has Re: prefix
  if (/^re:/i.test(subject)) {
    return subject;
  }

  return `Re: ${subject}`;
}

export function buildForwardSubject(originalSubject: string): string {
  const subject = originalSubject?.trim() || 'No Subject';
  return `Fwd: ${subject}`;
}
