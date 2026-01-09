export const getErrorMessage = (error) => {
  if (!error) {
    return '';
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return '요청에 실패했어요.';
};
