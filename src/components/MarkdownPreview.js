import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownPreview = ({ text }) => (
  <div className="markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ alt, ...props }) => <img alt={alt || ''} {...props} loading="lazy" />,
        a: ({ children, ...props }) => (
          <a {...props} target="_blank" rel="noreferrer">
            {children || props.href}
          </a>
        ),
      }}
    >
      {text || ''}
    </ReactMarkdown>
  </div>
);

export default MarkdownPreview;
