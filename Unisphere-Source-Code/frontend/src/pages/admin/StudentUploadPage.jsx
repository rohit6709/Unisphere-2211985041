import React from 'react';
import { Link } from 'react-router-dom';
import { Download, FileUp, FileCheck2, AlertTriangle, ArrowLeft, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/axios';
import { getAllStudents } from '@/services/authService';
import { DataTable } from '@/components/ui/DataTable';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileUpload } from '@/components/ui/FileUpload';

const REQUIRED_HEADERS = ['name', 'email', 'rollNo', 'department'];

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const split = (line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = split(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});
  });

  return { headers, rows };
}

export default function StudentUploadPage() {
  useDocumentTitle('Student CSV Upload | Unisphere');
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState([]);
  const [headers, setHeaders] = React.useState([]);
  const [report, setReport] = React.useState(null);
  const [progress, setProgress] = React.useState(0);

  const { data: existingStudentsData } = useQuery({
    queryKey: ['student-upload-existing'],
    queryFn: () => getAllStudents({ page: 1, limit: 1000 }),
  });

  const existingStudents = existingStudentsData?.students || [];
  const existingEmails = new Set(existingStudents.map((student) => student.email?.toLowerCase()).filter(Boolean));
  const existingRollNos = new Set(existingStudents.map((student) => student.rollNo?.toLowerCase()).filter(Boolean));

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await api.post('/api/v1/students/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      setReport(data);
      toast.success(`Uploaded ${data.insertedCount} students successfully`);
      setProgress(100);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Upload failed');
      setProgress(0);
    },
  });

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const text = await selectedFile.text();
    const parsed = parseCsv(text);
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !parsed.headers.includes(header));
    if (missingHeaders.length) {
      toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
      setFile(null);
      setPreview([]);
      setHeaders([]);
      return;
    }

    setFile(selectedFile);
    setHeaders(parsed.headers);
    setPreview(parsed.rows.slice(0, 10));
    setReport(null);
    setProgress(0);
  };

  const duplicatePreview = preview.map((row, index) => {
    const duplicateReasons = [];
    if (existingEmails.has(row.email?.toLowerCase())) duplicateReasons.push('Email exists');
    if (existingRollNos.has(row.rollNo?.toLowerCase())) duplicateReasons.push('Roll number exists');
    return { ...row, id: `${row.rollNo || row.email || index}`, duplicateReasons };
  });

  const downloadTemplate = () => {
    const csv = 'name,email,rollNo,department\nJane Doe,jane@example.com,CS23001,Computer Science';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'student_upload_template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Student Upload</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Validate CSV structure before upload, preview incoming records, flag duplicates, and review temporary passwords for newly created users.
          </p>
        </div>
        <Link to="/admin/students" className="inline-flex">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Workspace</h2>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
          </div>

          <div className="mt-6">
            <FileUpload
              label="CSV File"
              accept=".csv"
              value={file}
              onChange={handleFile}
              onClear={() => {
                setFile(null);
                setPreview([]);
                setHeaders([]);
                setReport(null);
                setProgress(0);
              }}
              progress={uploadMutation.isPending || progress > 0 ? progress : 0}
              dragLabel="Drop a CSV here or click to browse"
              helperText={`Required columns: ${REQUIRED_HEADERS.join(', ')}`}
            />
          </div>

          {file && (
            <div className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500">{headers.length} columns detected</p>
                </div>
                <Button onClick={() => uploadMutation.mutate(file)} isLoading={uploadMutation.isPending}>
                  <FileUp className="mr-2 h-4 w-4" /> Upload CSV
                </Button>
              </div>
              {(uploadMutation.isPending || progress > 0) && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Upload progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Validation Notes</h2>
          <div className="mt-5 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-white">Structure validation</p>
              <p className="mt-1">The page checks the CSV headers locally before any upload happens.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-white">Duplicate detection</p>
              <p className="mt-1">Preview rows are compared against existing student emails and roll numbers already in the system.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-white">Success report</p>
              <p className="mt-1">The upload result includes duplicates, row-level errors, and the created users with temporary passwords.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
        </div>

        <div className="mt-5">
          <DataTable
            data={duplicatePreview}
            rowKey="id"
            emptyTitle="No preview yet"
            emptyDescription="Choose a CSV file to preview the first ten rows before upload."
            emptyIcon={FileUp}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'rollNo', header: 'Roll No' },
              { key: 'department', header: 'Department' },
              {
                key: 'checks',
                header: 'Checks',
                cell: (row) => row.duplicateReasons.length ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> {row.duplicateReasons.join(', ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Clean
                  </span>
                ),
              },
            ]}
          />
        </div>
      </section>

      {report && (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Report</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Created" value={report.insertedCount || 0} tone="emerald" />
            <Metric label="Duplicates" value={report.duplicates?.length || 0} tone="amber" />
            <Metric label="Errors" value={report.errors?.length || 0} tone="rose" />
          </div>

          <ReportTable title="Created Users" rows={report.createdUsers || []} columns={['name', 'email', 'rollNo', 'department', 'tempPassword']} />
          <ReportTable title="Duplicates" rows={report.duplicates || []} columns={['name', 'email', 'rollNo', 'reason']} />
          <ReportTable title="Errors" rows={report.errors || []} columns={['error']} nestedField="data" />
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, tone }) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  return (
    <div className={`rounded-2xl px-4 py-5 ${styles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReportTable({ title, rows, columns, nestedField }) {
  if (!rows.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const payload = nestedField ? { ...row[nestedField], error: row.error } : row;
              return (
                <tr key={`${title}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3">{payload?.[column] ?? ''}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
