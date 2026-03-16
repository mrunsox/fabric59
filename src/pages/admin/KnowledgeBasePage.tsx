import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Folder, FileText, Search, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useKBCategories, useKBArticles, useCreateKBCategory, useCreateKBArticle, useUpdateKBArticle, useDeleteKBArticle, useDeleteKBCategory } from "@/hooks/useKnowledgeBase";

export default function KnowledgeBasePage() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data: categories = [], isLoading: catLoading } = useKBCategories();
  const [selectedCat, setSelectedCat] = useState<string | undefined>();
  const { data: articles = [], isLoading: artLoading } = useKBArticles(selectedCat);
  const createCategory = useCreateKBCategory();
  const createArticle = useCreateKBArticle();
  const updateArticle = useUpdateKBArticle();
  const deleteArticle = useDeleteKBArticle();
  const deleteCategory = useDeleteKBCategory();

  const [newCatName, setNewCatName] = useState("");
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [articleForm, setArticleForm] = useState({ title: "", slug: "", content: "", status: "draft" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleCreateCategory = () => {
    if (!orgId || !newCatName.trim()) return;
    createCategory.mutate({ name: newCatName.trim(), organization_id: orgId });
    setNewCatName("");
  };

  const handleSaveArticle = () => {
    if (!orgId || !articleForm.title.trim()) return;
    const slug = articleForm.slug || articleForm.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editingId) {
      updateArticle.mutate({ id: editingId, title: articleForm.title, content: articleForm.content, status: articleForm.status, category_id: selectedCat });
    } else {
      createArticle.mutate({ ...articleForm, slug, organization_id: orgId, category_id: selectedCat });
    }
    setNewArticleOpen(false);
    setEditingId(null);
    setArticleForm({ title: "", slug: "", content: "", status: "draft" });
  };

  const filteredArticles = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.content || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Manage categories and articles for agent reference</p>
        </div>
        <Dialog open={newArticleOpen} onOpenChange={setNewArticleOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" onClick={() => { setEditingId(null); setArticleForm({ title: "", slug: "", content: "", status: "draft" }); }}>
              <Plus className="h-4 w-4" /> New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={articleForm.title} onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Slug (auto-generated)" value={articleForm.slug} onChange={e => setArticleForm(f => ({ ...f, slug: e.target.value }))} />
              <Textarea placeholder="Content (markdown)" value={articleForm.content} onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))} rows={8} />
              <Select value={articleForm.status} onValueChange={v => setArticleForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSaveArticle} className="w-full">{editingId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Folder className="h-4 w-4" /> Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant={!selectedCat ? "default" : "ghost"} size="sm" className="w-full justify-start" onClick={() => setSelectedCat(undefined)}>
              All Articles ({articles.length})
            </Button>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1">
                <Button variant={selectedCat === cat.id ? "default" : "ghost"} size="sm" className="flex-1 justify-start" onClick={() => setSelectedCat(cat.id)}>
                  {cat.name}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory.mutate(cat.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-1 pt-2">
              <Input placeholder="New category" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && handleCreateCategory()} />
              <Button size="sm" variant="outline" onClick={handleCreateCategory} disabled={!newCatName.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Articles */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {(catLoading || artLoading) && <p className="text-sm text-muted-foreground">Loading…</p>}
          {filteredArticles.length === 0 && !artLoading && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No articles yet. Create one to get started.</p>
            </CardContent></Card>
          )}
          <div className="space-y-3">
            {filteredArticles.map(article => (
              <Card key={article.id}>
                <CardContent className="pt-4 pb-4 flex items-start gap-4">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">{article.title}</h4>
                      <Badge variant={article.status === "published" ? "default" : "secondary"} className="text-xs">{article.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.content || "No content"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditingId(article.id);
                      setArticleForm({ title: article.title, slug: article.slug, content: article.content || "", status: article.status });
                      setNewArticleOpen(true);
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteArticle.mutate(article.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
