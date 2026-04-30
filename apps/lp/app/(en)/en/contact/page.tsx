import { Mail } from "lucide-react";
import { ContactForm } from "../../../components/ContactForm";
import { SiteFooterEn } from "../../../components/SiteFooterEn";
import { SiteHeaderEn } from "../../../components/SiteHeaderEn";

export const metadata = {
  title: "Contact | koji-lens",
  description:
    "Contact koji-lens (Quinque, Inc.). For pricing / contract questions, technical support, or general inquiries.",
};

const SUPPORT_EMAIL = "support@kojihq.com";

export default function ContactPage() {
  const enabled = Boolean(process.env.RESEND_API_KEY);

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeaderEn />

      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Mail className="size-3.5" />
            Support
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Contact
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-slate-600">
            We accept inquiries about koji-lens (Quinque, Inc.).
            We aim to respond <strong>within 5 business days</strong>
            (some categories or busy periods may take longer).
          </p>
          <p className="mt-2 text-sm text-slate-500">
            For technical issues / feature requests, use{" "}
            <a
              href="https://github.com/etoryoki/koji-lens/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub Issues
            </a>
            . For lighter questions, you can DM us on Bluesky at{" "}
            <a
              href="https://bsky.app/profile/kojihq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @kojihq.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <ContactForm enabled={enabled} />
            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              Personal information collected through this form is used only
              for responding to your inquiry. See our{" "}
              <a href="/en/legal/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{" "}
              for details. To contact us directly by email, write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-blue-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooterEn />
    </main>
  );
}
