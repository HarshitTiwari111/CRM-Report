import axiosInstance from './axios';

const downloadBlob = async (url, params, filename) => {
  const response = await axiosInstance.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const downloadPdfReport = (params) => downloadBlob('/reports/pdf', params, `report-${Date.now()}.pdf`);

export const downloadExcelReport = (params) =>
  downloadBlob('/reports/excel', params, `report-${Date.now()}.xlsx`);

export const downloadCsvReport = (params) => downloadBlob('/reports/csv', params, `report-${Date.now()}.csv`);
