import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Extracted default values
const defaultTeaData = [
  { id: 1, type: 'Pink tea', amount: 0.025, packs: '', price: 8 },
  { id: 2, type: 'Pink tea(paper can)', amount: 0.025, packs: '', price: 10 },
  { id: 3, type: 'Vita glow', amount: 0.025, packs: '', price: 5 },
  { id: 4, type: 'Christmass tea', amount: 0.005, packs: '', price: 7 },
  { id: 5, type: 'Christmass tea (reusable bag)', amount: 0.005, packs: '', price: 10 },
  { id: 6, type: 'White tea', amount: 0.025, packs: '', price: 7 },
  { id: 7, type: 'White tea(paper can)', amount: 0.025, packs: '', price: 9 },
  { id: 8, type: 'Purple tea', amount: 0.01, packs: '', price: 7 },
  { id: 9, type: 'Purple tea(paper can)', amount: 0.005, packs: '', price: 9 },
  { id: 10, type: 'Slim beauty', amount: 0.01, packs: '', price: 11 },
  { id: 11, type: 'Slim beauty(paper can)', amount: 0.005, packs: '', price: 7 },
  { id: 12, type: 'Golden tips', amount: 0.002, packs: '', price: 14 },
  { id: 13, type: 'Golden tips', amount: 0.004, packs: '', price: 25 },
  { id: 14, type: 'Golden tips', amount: 0.005, packs: '', price: 35 },
];

export default function SellingDetailsTable() {
  const [tableData, setTableData] = useState(defaultTeaData);
  const [exchangeRate, setExchangeRate] = useState(300);
  
  // Single State for the active month (Defaults to current year-month, e.g., "2026-04")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Handle changes for Amount, Packs, and Price
  const handleInputChange = (id, field, value) => {
    const updatedData = tableData.map((row) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setTableData(updatedData);
  };

  // 1. FETCH DATA FOR THE SELECTED MONTH (Added Token)
  const handleFetchData = async () => {
    if (!selectedMonth) {
      toast.error("Please select a month first.");
      return;
    }

    setIsFetching(true);
    const loadToast = toast.loading('Fetching data...');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/selling-details?month=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.records && data.records.length > 0) {
          const fetchedRecords = data.records;
          const mergedData = defaultTeaData.map((defaultRow) => {
            const foundRecord = fetchedRecords.find((r) => r.type === defaultRow.type);
            if (foundRecord) {
              return { 
                ...defaultRow, 
                amount: foundRecord.amount, 
                packs: foundRecord.packs, 
                price: foundRecord.price 
              };
            }
            return { ...defaultRow, packs: '' };
          });

          setTableData(mergedData);
          if (data.exchangeRate) setExchangeRate(data.exchangeRate);
          toast.success(`Data for ${selectedMonth} loaded!`, { id: loadToast });
        } else {
          setTableData(defaultTeaData);
          toast('No data found. Ready for new entries.', { icon: 'ℹ️', id: loadToast });
        }
      } else {
        if (response.status === 401 || response.status === 403) {
            toast.error('Session expired. Please log in again.', { id: loadToast });
        } else {
            toast.error('Failed to fetch data.', { id: loadToast });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Network error while fetching.', { id: loadToast });
    } finally {
      setIsFetching(false);
    }
  };

  // 2. SAVE DATA UNDER THE SELECTED MONTH (Added Token)
  const handleSaveToDB = async () => {
    const recordsToSave = tableData.filter((row) => row.packs !== '' && row.packs > 0);
    
    if (recordsToSave.length === 0) {
      toast.error("No packs entered. Nothing to save!");
      return;
    }

    setIsSaving(true);
    const saveToast = toast.loading('Saving to database...');

    try {
      const saveDate = new Date(`${selectedMonth}-01`).toISOString();
      const token = localStorage.getItem('token');

      const response = await fetch(`${BACKEND_URL}/api/selling-details`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          date: saveDate, 
          exchangeRate: exchangeRate,
          records: recordsToSave,
        }),
      });

      if (response.ok) {
        toast.success(`Data successfully saved for ${selectedMonth}!`, { id: saveToast });
      } else {
        if (response.status === 403) {
            toast.error("Access Denied. You do not have permission to save.", { id: saveToast });
        } else {
            toast.error('Failed to save data.', { id: saveToast });
        }
      }
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Network error while saving.', { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate Grand Totals
  const totalUsd = tableData.reduce((sum, row) => sum + (Number(row.packs) || 0) * (Number(row.price) || 0), 0);
  const totalLkr = totalUsd * exchangeRate;

  // 3. GENERATE PDF FUNCTION
  const handleDownloadPDF = () => {
    const doc = new jsPDF('portrait'); 
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(46, 107, 59); // Green
    doc.text("Monthly Selling Details Summary", 14, 22);
    
    // Sub-info
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Active Month: ${selectedMonth}`, 14, 32);
    doc.text(`Exchange Rate: 1 USD = Rs. ${exchangeRate}`, 14, 38);

    // Table Headers with customized background colors
    const tableHead = [[
      { content: "Type of Tea", styles: { halign: 'center', fillColor: [50, 50, 50] } },
      { content: "Amount (kg)", styles: { halign: 'center', fillColor: [46, 107, 59] } },
      { content: "Nu. of Packs", styles: { halign: 'center', fillColor: [40, 88, 180] } },
      { content: "Price/One ($)", styles: { halign: 'center', fillColor: [214, 107, 45] } },
      { content: "Total (USD)", styles: { halign: 'center', fillColor: [50, 50, 50] } },
      { content: "Total (LKR)", styles: { halign: 'center', fillColor: [184, 29, 29] } }
    ]];
    
    // Table Rows
    const tableRows = tableData.map(row => {
      const calculatedUsd = (Number(row.packs) || 0) * (Number(row.price) || 0);
      const calculatedLkr = calculatedUsd * exchangeRate;
      
      return [
        row.type,
        Number(row.amount).toFixed(3),
        row.packs ? row.packs.toString() : "0",
        Number(row.price).toFixed(2),
        calculatedUsd.toFixed(2),
        calculatedLkr.toLocaleString()
      ];
    });

    // Grand Total Row
    tableRows.push([
      "GRAND TOTAL",
      "-",
      "-",
      "-",
      totalUsd.toFixed(2),
      totalLkr.toLocaleString()
    ]);

    // Render Table
    autoTable(doc, {
      startY: 45,
      head: tableHead,
      body: tableRows,
      theme: 'grid',
      headStyles: { textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10, halign: 'center', valign: 'middle' },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', halign: 'left' } },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const colIdx = data.column.index;
          
          // Match text colors to column themes
          if (colIdx === 1) data.cell.styles.textColor = [46, 107, 59]; // Green for amount
          else if (colIdx === 2) data.cell.styles.textColor = [40, 88, 180]; // Blue for packs
          else if (colIdx === 3) data.cell.styles.textColor = [214, 107, 45]; // Orange for price
          else if (colIdx === 5) data.cell.styles.textColor = [184, 29, 29]; // Red for LKR

          // Highlight Grand Total Row
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = 'bold';
            if (colIdx === 0) data.cell.styles.halign = 'right';
          }
        }
      }
    });

    // Save PDF
    doc.save(`Selling_Details_${selectedMonth}.pdf`);
    toast.success("PDF Downloaded Successfully!");
  };

  // --- STYLES ---
  const colors = {
    green: '#2e6b3b', lightGreenBg: '#f4f9f4',
    blue: '#2858b4', lightBlueBg: '#f0f5fd',
    orange: '#d66b2d', lightOrangeBg: '#fdf7f2',
    red: '#b81d1d', lightRedBg: '#fcedec',
    textDark: '#1a1a1a', border: '#e0e0e0', primaryBlue: '#2563eb',
  };

  const styles = {
    container: { maxWidth: '1100px', margin: '20px auto', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    mainTitle: { color: colors.green, fontSize: '28px', fontWeight: 'bold', margin: '0', display: 'flex', alignItems: 'center', gap: '10px' },
    actionButtons: { display: 'flex', gap: '12px' },
    btnSave: { padding: '10px 20px', backgroundColor: colors.green, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    btnPdf: { padding: '10px 20px', backgroundColor: colors.primaryBlue, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    btnFilter: { padding: '8px 16px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
    controlsRow: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
    settingsCard: { border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '15px 20px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flex: '1', minWidth: '250px' },
    cardHeader: { fontSize: '12px', fontWeight: 'bold', color: '#111', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '8px' },
    inputGroupRow: { display: 'flex', alignItems: 'center', gap: '10px' },
    dateInput: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none', fontFamily: 'inherit', fontWeight: 'bold' },
    tableWrapper: { boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thBase: { padding: '15px 10px', textAlign: 'center', fontSize: '12px', fontWeight: '800', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textTransform: 'uppercase' },
    tdBase: { padding: '12px 10px', textAlign: 'center', fontSize: '14px', fontWeight: '700', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` },
    inputBase: { width: '80%', padding: '8px', borderRadius: '4px', textAlign: 'center', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' },
  };

  return (
    <div style={styles.container}>
      {/* Toast Container */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Top Header & Global Actions */}
      <div style={styles.topBar}>
        <h1 style={styles.mainTitle}>Monthly Selling Details</h1>
        <div style={styles.actionButtons}>
          <button onClick={handleDownloadPDF} style={styles.btnPdf}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download PDF
          </button>
          <button onClick={handleSaveToDB} disabled={isSaving} style={{...styles.btnSave, opacity: isSaving ? 0.7 : 1}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      </div>

      {/* Control Cards */}
      <div style={styles.controlsRow}>
        
        {/* MONTH WORKSPACE CARD */}
        <div style={styles.settingsCard}>
          <div style={styles.cardHeader}>🗓️ ACTIVE WORKSPACE MONTH</div>
          <div style={styles.inputGroupRow}>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              style={styles.dateInput} 
            />
            <button onClick={handleFetchData} disabled={isFetching} style={styles.btnFilter}>
              {isFetching ? 'Loading...' : 'Load Month Data'}
            </button>
          </div>
        </div>

        {/* Exchange Rate Card */}
        <div style={styles.settingsCard}>
          <div style={styles.cardHeader}>💵 ADJUST RATES</div>
          <div style={styles.inputGroupRow}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>1 USD = Rs.</span>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              style={{ ...styles.dateInput, width: '100px' }}
            />
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.thBase, color: colors.textDark, backgroundColor: '#f9f9f9' }}>Type of tea</th>
              <th style={{ ...styles.thBase, color: colors.green, backgroundColor: colors.lightGreenBg }}>Amount (kg)</th>
              <th style={{ ...styles.thBase, color: colors.blue, backgroundColor: colors.lightBlueBg }}>Number of Packs</th>
              <th style={{ ...styles.thBase, color: colors.orange, backgroundColor: colors.lightOrangeBg }}>Price per one (USD)</th>
              <th style={{ ...styles.thBase, color: colors.textDark, backgroundColor: '#f9f9f9' }}>Total (USD)</th>
              <th style={{ ...styles.thBase, color: colors.red, backgroundColor: colors.lightRedBg }}>Total (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => {
              const calculatedUsd = (Number(row.packs) || 0) * (Number(row.price) || 0);
              const calculatedLkr = calculatedUsd * exchangeRate;

              return (
                <tr key={row.id}>
                  <td style={{ ...styles.tdBase, color: colors.green, textAlign: 'left', paddingLeft: '20px' }}>{row.type}</td>
                  <td style={styles.tdBase}>
                    <input type="number" step="0.001" value={row.amount} onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)} style={{ ...styles.inputBase, border: `1px solid transparent`, color: colors.green }} />
                  </td>
                  <td style={styles.tdBase}>
                    <input type="number" placeholder="0" value={row.packs} onChange={(e) => handleInputChange(row.id, 'packs', e.target.value)} style={{ ...styles.inputBase, border: `1px solid ${colors.blue}`, color: colors.blue }} />
                  </td>
                  <td style={styles.tdBase}>
                    <input type="number" step="0.1" value={row.price} onChange={(e) => handleInputChange(row.id, 'price', e.target.value)} style={{ ...styles.inputBase, border: `1px solid transparent`, color: colors.orange }} />
                  </td>
                  <td style={{ ...styles.tdBase, color: colors.textDark }}>{calculatedUsd > 0 ? calculatedUsd.toFixed(2) : '0'}</td>
                  <td style={{ ...styles.tdBase, color: colors.red }}>{calculatedLkr > 0 ? calculatedLkr.toLocaleString() : '0'}</td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: colors.lightRedBg }}>
              <td colSpan="4" style={{ ...styles.tdBase, textAlign: 'right', paddingRight: '20px', color: colors.textDark, borderBottom: 'none' }}>GRAND TOTAL</td>
              <td style={{ ...styles.tdBase, color: colors.textDark, fontSize: '18px', borderBottom: 'none' }}>{totalUsd.toFixed(2)}</td>
              <td style={{ ...styles.tdBase, color: colors.red, fontSize: '18px', borderBottom: 'none' }}>{totalLkr.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}