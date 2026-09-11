import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleHelp, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PageShell, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import ProcessDiagram from "../components/ProcessDiagram";
import { allHelpArticles, HELP_CATEGORIES } from "../content/helpContent";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { usePermissions } from "../../../hooks/usePermissions";
import { getRouteModule, getRoutePermission } from "../../../app/navigationConfig";

function HelpCenterPage() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { isEnabled } = useModuleAccess();
  const { can } = usePermissions();
  const [query, setQuery] = useState("");
  const articles = useMemo(() => allHelpArticles().filter((article) => (article.steps || []).every((step) => !step.path || (isEnabled(getRouteModule(step.path)) && can(getRoutePermission(step.path))))), [can, isEnabled]);
  const visibleCategories = useMemo(() => HELP_CATEGORIES.map((category) => ({ ...category, articles: category.articles.filter((article) => articles.some((item) => item.id === article.id)) })).filter((category) => category.articles.length), [articles]);
  const selected = articleId ? articles.find((item) => item.id === articleId) : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("uz-UZ");
    if (!q) return articles;
    return articles.filter((article) => `${article.title} ${article.summary} ${article.categoryTitle} ${(article.body || []).join(" ")} ${(article.steps || []).map((step) => `${step.title} ${step.pathLabel}`).join(" ")}`.toLocaleLowerCase("uz-UZ").includes(q));
  }, [articles, query]);

  if (selected) {
    return (
      <PageShell
        title={selected.title}
        description={selected.summary}
        eyebrow={`${selected.categoryTitle} · Amaliy qo‘llanma`}
        actions={<SecondaryButton type="button" onClick={() => navigate("/help")}><ArrowLeft size={15} /> Yordam markazi</SecondaryButton>}
      >
        <div className="qp-help-article-shell">
          <aside className="qp-card">
            <strong>{selected.title}</strong>
            <p>{selected.summary}</p>
            <div>{visibleCategories.map((category) => <button type="button" key={category.id} onClick={() => navigate("/help")}>{category.title}</button>)}</div>
          </aside>
          <article className="qp-card">
            <span className="qp-help-eyebrow"><BookOpen size={15} /> Amaliy qo‘llanma</span>
            {selected.process?.length ? <ProcessDiagram steps={selected.process} /> : null}
            {selected.steps?.length ? (
              <section className="qp-help-steps">
                <h2>Platformada bajarish yo‘li</h2>
                {selected.steps.map((step, index) => (
                  <div key={`${step.title}-${index}`}>
                    <b>{index + 1}</b>
                    <span><strong>{step.title}</strong><small>{step.pathLabel}</small></span>
                    {step.path ? <button type="button" onClick={() => navigate(step.path)}>Ochish <ExternalLink size={14} /></button> : null}
                  </div>
                ))}
              </section>
            ) : null}
            <div className="qp-help-copy">{(selected.body || []).map((text) => <p key={text}>{text}</p>)}</div>
            <div className="qp-help-tip"><CircleHelp size={18} /><div><strong>Qulay prinsipi</strong><span>Foydalanuvchiga ruxsat berilgan jarayon va keyingi kerakli biznes amali ko‘rsatiladi.</span></div></div>
          </article>
        </div>
      </PageShell>
    );
  }

  const quick = ["first-setup", "first-order", "fulfillment", "delivery-flow", "debt", "modules"]
    .map((id) => articles.find((article) => article.id === id))
    .filter(Boolean);

  return (
    <PageShell
      title="Yordam markazi"
      description="Qayerda nima borligini o‘qibgina qolmang — qo‘llanmadagi tugmalar orqali kerakli sahifaga darhol o‘ting."
      eyebrow="Qulay qo‘llanmasi"
    >
      <div className="qp-help-console-home">
        <label className="qp-help-search-compact"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Masalan: buyurtma yaratish, qarz, inventarizatsiya..." /></label>

        {query ? (
          <section className="qp-card qp-help-results-compact">
            <div className="qp-help-section-title"><span>Qidiruv natijalari</span><strong>{filtered.length} ta</strong></div>
            {filtered.map((article) => <button type="button" key={article.id} onClick={() => navigate(`/help/${article.id}`)}><span><strong>{article.title}</strong><small>{article.categoryTitle} · {article.summary}</small></span><ChevronRight size={16} /></button>)}
          </section>
        ) : <>
          <section className="qp-card qp-help-quick">
            <div className="qp-help-section-title"><span>Tezkor qo‘llanmalar</span><strong>Eng ko‘p kerak bo‘ladigan jarayonlar</strong></div>
            <div>{quick.map((article) => <button type="button" key={article.id} onClick={() => navigate(`/help/${article.id}`)}><BookOpen size={17} /><span><strong>{article.title}</strong><small>{article.summary}</small></span><ArrowRight size={15} /></button>)}</div>
          </section>
          <section className="qp-card qp-help-category-list">
            <div className="qp-help-section-title"><span>Barcha mavzular</span><strong>{articles.length} ta qo‘llanma</strong></div>
            {visibleCategories.map((category) => (
              <article key={category.id}>
                <div><CircleHelp size={17} /><span><strong>{category.title}</strong><small>{category.description}</small></span><b>{category.articles.length}</b></div>
                <section>{category.articles.map((article) => <button type="button" key={article.id} onClick={() => navigate(`/help/${article.id}`)}><span><strong>{article.title}</strong><small>{article.summary}</small></span><ChevronRight size={15} /></button>)}</section>
              </article>
            ))}
          </section>
        </>}
      </div>
    </PageShell>
  );
}

export default HelpCenterPage;
