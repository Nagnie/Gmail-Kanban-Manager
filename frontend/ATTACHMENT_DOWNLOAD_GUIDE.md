# Attachment Download Integration Guide

## Overview

Tôi đã setup API call để download attachment bằng React Query theo cùng pattern với mailboxes và email services.

## File Structure Created

```
src/services/attachment/
├── types.ts              # Type definitions
├── api.ts                # API call function
├── queryKeys.ts          # Query keys for React Query
├── useAttachmentQueries.ts # Custom React Query hooks
└── index.ts              # Exports
```

## Usage

### 1. Import Hook

```typescript
import { useDownloadAttachmentMutation } from "@/services/tanstack-query";
```

### 2. Use in Component

```typescript
export function EmailDetail({ message, onBack }: EmailDetailProps) {
    // Initialize mutation
    const { mutate: downloadAttachment, isPending: isDownloading } =
        useDownloadAttachmentMutation();

    // Handle download
    const handleDownloadAttachment = (attachmentId: string, filename: string, mimeType: string) => {
        if (!message) return;

        downloadAttachment({
            attachmentId,
            messageId: message.id,
            filename,
            mimeType,
        });
    };

    // Use in button
    <Button
        onClick={() =>
            handleDownloadAttachment(attachment.id, attachment.filename, attachment.mimeType)
        }
        disabled={isDownloading}
    >
        <Download className="w-4 h-4" />
    </Button>;
}
```

## How It Works

### 1. **API Call** (`api.ts`)

-   Gọi endpoint `/api/v1/attachments/{attachmentId}`
-   Pass query parameters: `messageId`, `filename`, `mimeType`
-   Nhận response dạng `Blob` (binary file data)

### 2. **Mutation Hook** (`useAttachmentQueries.ts`)

-   Sử dụng `useMutation` từ React Query
-   Tự động trigger download khi `onSuccess`
-   Tạo blob URL, click link ẩn, và clean up

### 3. **Component Integration** (`EmailDetail.tsx`)

-   Import hook từ tanstack-query
-   Call mutation khi user click Download button
-   Button disabled lúc đang download (`isDownloading`)

## API Endpoint Details

```typescript
GET /api/v1/attachments/:attachmentId?messageId=&filename=&mimeType=
```

**Query Parameters:**

-   `messageId` (required): ID của email chứa attachment
-   `filename` (required): Tên file (URL encoded)
-   `mimeType` (required): MIME type của file

**Response:**

-   Blob data (file content)
-   Content-Disposition header chứa filename (RFC 5987 encoded)

## Features

✅ **Automatic Download**: File được download tự động khi mutation success
✅ **Error Handling**: Console error nếu download fail
✅ **Loading State**: `isPending` state để disable button lúc downloading
✅ **Query Keys**: Proper query key structure cho cache management
✅ **Type Safe**: Full TypeScript support

## Notes

-   Hook sử dụng `dangerouslySetInnerHTML` trick tương tự GMail để trigger download
-   File được cleanup từ memory sau khi download (`revokeObjectURL`)
-   Support unicode filenames thông qua RFC 5987 encoding
