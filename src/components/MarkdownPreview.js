import React from 'react';

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatInlineMarkdown = (text) => {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
};

const MarkdownPreview = ({ text }) => {
  const blocks = [];
  const lines = (text || '').split('\n');
  let listItems = [];
  let codeLines = [];
  let inCode = false;
  let blockIndex = 0;

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    const items = listItems.map((item) => (
      <li
        key={`li-${blockIndex}-${item}`}
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }}
      />
    ));
    blocks.push(
      <ul key={`ul-${blockIndex}`} className="markdown__list">
        {items}
      </ul>
    );
    blockIndex += 1;
    listItems = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) {
      return;
    }

    const code = codeLines.join('\n');
    blocks.push(
      <pre key={`pre-${blockIndex}`}>
        <code>{code}</code>
      </pre>
    );
    blockIndex += 1;
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();

    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${blockIndex}`}
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(4)) }}
        />
      );
      blockIndex += 1;
      return;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${blockIndex}`}
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(3)) }}
        />
      );
      blockIndex += 1;
      return;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h1-${blockIndex}`}
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(2)) }}
        />
      );
      blockIndex += 1;
      return;
    }

    if (!line.trim()) {
      blocks.push(<div key={`spacer-${blockIndex}`} className="md-spacer" />);
      blockIndex += 1;
      return;
    }

    blocks.push(
      <p
        key={`p-${blockIndex}`}
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
      />
    );
    blockIndex += 1;
  });

  flushList();
  flushCode();

  return <div className="markdown">{blocks}</div>;
};

export default MarkdownPreview;
