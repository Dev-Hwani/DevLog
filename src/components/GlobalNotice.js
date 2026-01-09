const GlobalNotice = ({ notice, onClose }) => {
  if (!notice) {
    return null;
  }

  return (
    <div className={`notice notice--${notice.type}`}>
      <div className="notice__inner">
        <span className="notice__message">{notice.message}</span>
        <button type="button" className="notice__close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
};

export default GlobalNotice;
