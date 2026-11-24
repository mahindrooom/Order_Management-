import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:4000/api/upload-indent', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      onUploadSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleCsvData = `sku_code,item_name,category,unit,required_qty,target_rate
PLK-VEG-POT-01,Potato Agra Fresh (ज्योति आलू),Vegetables,kg,150,22.50
PLK-VEG-ONI-02,Onion Nashik Red (लाल प्याज),Vegetables,kg,120,28.00
PLK-VEG-TOM-03,Tomato Hybrid Grade-A (टमाटर),Vegetables,kg,100,24.00
PLK-VEG-CAP-04,Capsicum Green Shimla (हरी शिमला मिर्च),Vegetables,kg,50,45.00
PLK-FRU-BAN-08,Robusta Banana Semi-Ripe (केला),Fruits,kg,90,30.00`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-pluckk-indent.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload Nightly Indent</h3>
              <p className="text-xs text-slate-400">Generates real-time requirement pool for all suppliers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-800/30">
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              id="indent-file"
            />
            <label htmlFor="indent-file" className="cursor-pointer block space-y-2">
              <FileText size={32} className="mx-auto text-slate-500" />
              <div className="text-sm font-semibold text-slate-200">
                {file ? file.name : 'Choose CSV or JSON indent file'}
              </div>
              <p className="text-xs text-slate-500">
                Supports standard Pluckk indent files with SKU Code, Name, Qty & Rate
              </p>
            </label>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Need a template?</span>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <Download size={13} />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition shadow-sm"
            >
              {loading ? 'Uploading & Broadcasting...' : 'Upload & Distribute Indent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
