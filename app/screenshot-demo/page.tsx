import MailientScreenshot from '@/components/MailientScreenshot';

export const metadata = {
  title: 'Mailient Screenshot Demo',
  description: 'Premium screenshot showcase of Mailient AI Email Command Center',
};

export default function ScreenshotDemoPage() {
  return (
    <div className="min-h-screen">
      <MailientScreenshot />
    </div>
  );
}
