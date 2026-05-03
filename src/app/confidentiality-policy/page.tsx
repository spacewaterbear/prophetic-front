import { Markdown } from "@/components/Markdown";

const POLICY_URL =
  "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/legal/politique_de_conf.md";

export default async function ConfidentialityPolicyPage() {
  let content = "";
  try {
    const res = await fetch(POLICY_URL, { next: { revalidate: 3600 } });
    if (res.ok) {
      content = await res.text();
    }
  } catch {
    content = "";
  }

  return (
    <div className="min-h-screen bg-[rgb(249,248,244)] dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-12">
          {content ? (
            <Markdown content={content} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Impossible de charger la politique de confidentialité.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
