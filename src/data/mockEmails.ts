import type { Email } from "@/components/EmailCard";

export const mockEmails: Email[] = [
  {
    id: 1,
    sender: "Google",
    subject: "Security alert for sakshamarora1202@gmail.com",
    preview: "Composio was granted access to your linked Google account sakshamarora1202@gmail.com. If you did not grant this access, review your account security immediately.",
    time: "9:29 PM",
    date: "Apr 5",
    importance: "critical",
    unread: true,
    category: "Security",
  },
  {
    id: 2,
    sender: "Google",
    subject: "Security alert",
    preview: "You allowed Composio access to some of your Google Account data sakshamarora1202@gmail.com. If you didn't do this, review your account settings.",
    time: "9:29 PM",
    date: "Apr 5",
    importance: "critical",
    unread: true,
    category: "Security",
  },
  {
    id: 3,
    sender: "ZipRecruiter",
    subject: "saksham, STEM Castle has an open position",
    preview: "STEM Castle has an open position that may match your profile. Check out this new job opportunity on ZipRecruiter.",
    time: "6:47 PM",
    date: "Apr 4",
    importance: "medium",
    unread: true,
    category: "Work",
  },
];
