import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createArticle, getArticle, updateArticle, uploadThumbnail } from '../api/articles';
import { buildPath } from '../routes/paths';
import { parseTagsInput } from '../utils/tags';
import { buildImageUrl, validateImageFile } from '../utils/images';
import { getErrorMessage } from '../utils/requests';
import MarkdownPreview from '../components/MarkdownPreview';

const EditorPage = () => {
  const { id } = useParams();
  const articleId = id ? Number(id) : null;
  const isEditing = Number.isFinite(articleId);
  const navigate = useNavigate();
  const queryCache = useQueryClient();
  const [formError, setFormError] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailError, setThumbnailError] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    tags: '',
    category: '',
    level: '',
    isPublic: true,
  });

  const articleQuery = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (articleQuery.data) {
      setForm({
        title: articleQuery.data.title || '',
        summary: articleQuery.data.summary || '',
        content: articleQuery.data.content || '',
        tags: (articleQuery.data.tags || []).join(', '),
        category: articleQuery.data.category || '',
        level: articleQuery.data.level || '',
        isPublic: articleQuery.data.isPublic ?? true,
      });
    }
  }, [articleQuery.data]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEditing ? updateArticle(articleId, payload) : createArticle(payload),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      summary: form.summary.trim(),
      isPublic: form.isPublic,
      tags: parseTagsInput(form.tags),
      category: form.category.trim() || null,
      level: form.level.trim() || null,
    };

    try {
      if (thumbnailFile) {
        const validation = validateImageFile(thumbnailFile);
        if (validation) {
          setThumbnailError(validation);
          return;
        }
      }
      const response = await saveMutation.mutateAsync(payload);
      const savedId = isEditing ? articleId : response?.id;
      if (thumbnailFile && savedId) {
        await uploadThumbnail(savedId, thumbnailFile);
      }
      queryCache.invalidateQueries({ queryKey: ['articles'] });
      if (savedId) {
        navigate(buildPath.article(savedId));
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleThumbnailChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setThumbnailError('');
      setThumbnailFile(null);
      setThumbnailPreview('');
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setThumbnailError(validation);
      setThumbnailFile(null);
      setThumbnailPreview('');
      return;
    }
    setThumbnailError('');
    setThumbnailFile(file);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const existingThumbnail = buildImageUrl(articleQuery.data?.thumbnailUrl);
  const previewSource = thumbnailPreview || existingThumbnail;

  return (
    <section className="editor">
      <div className="editor__header">
        <div>
          <span className="section-title">에디터</span>
          <h2>{isEditing ? '글 수정' : '새 글 작성'}</h2>
        </div>
        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          뒤로
        </button>
      </div>
      <form className="editor__layout" onSubmit={handleSubmit}>
        <div className="editor__form">
          <label>
            제목
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="명확한 제목을 입력하세요"
            />
          </label>
          <label>
            요약
            <textarea
              rows={3}
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              placeholder="카드에 보일 짧은 요약을 입력하세요"
            />
          </label>
          <label>
            내용
            <textarea
              rows={12}
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              placeholder="Markdown으로 작성하세요"
            />
          </label>
          <label>
            태그
            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="react, spring, mysql"
            />
          </label>
          <label>
            카테고리
            <input
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Frontend / Backend / Fullstack"
            />
          </label>
          <label>
            난이도
            <input
              value={form.level}
              onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
              placeholder="Beginner / Intermediate / Advanced"
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
            />
            <span>공개</span>
          </label>
          <label>
            썸네일 이미지
            <input type="file" accept="image/png,image/jpeg" onChange={handleThumbnailChange} />
            {thumbnailError && <div className="form-error">{thumbnailError}</div>}
          </label>
          {previewSource && (
            <div className="image-preview">
              <img src={previewSource} alt="Thumbnail preview" />
            </div>
          )}
          {formError && <div className="form-error">{formError}</div>}
          <button type="submit" className="button button--solid" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '저장 중...' : isEditing ? '글 수정' : '글 발행'}
          </button>
        </div>
        <div className="editor__preview">
          <div className="preview-title">미리보기</div>
          <div className="preview-card">
            <h3>{form.title || '제목 없음'}</h3>
            <p>{form.summary || '요약이 여기에 표시돼요.'}</p>
          </div>
          <MarkdownPreview text={form.content || ''} />
        </div>
      </form>
    </section>
  );
};

export default EditorPage;
