import { API_BASE_URL } from '../api/config';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

export const buildImageUrl = (value) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('http')) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
};

export const validateImageFile = (file) => {
  if (!file) {
    return '파일을 선택하지 않았어요.';
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'JPG, PNG 파일만 업로드할 수 있어요.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return '이미지는 10MB 이하만 업로드할 수 있어요.';
  }
  return '';
};
