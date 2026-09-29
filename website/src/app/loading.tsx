import PageLayout from "@/components/PageLayout";

export default function Loading() {
  return (
    <PageLayout>
      <section className="py-24 text-center" role="status" aria-live="polite">
        <p className="text-gold font-serif text-2xl mb-3">Connecting to The Lattice</p>
        <p className="text-sm text-foreground-muted">Loading the latest from the congregation…</p>
      </section>
    </PageLayout>
  );
}
