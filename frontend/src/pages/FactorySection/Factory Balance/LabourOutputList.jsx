import React, { useEffect, useState } from 'react';

const LabourOutputTable = () => {
    const [groupedData, setGroupedData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/labour-output');
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.statusText}`);
                }

                const result = await response.json();
                const grouped = result.reduce((acc, record) => {
                    const date = record.date ? record.date.split('T')[0] : 'Unknown Date';
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(record);
                    return acc;
                }, {});

                const groupedArray = Object.entries(grouped).map(([date, entries]) => ({ date, entries }));
                setGroupedData(groupedArray);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="table-container">
            <style>{`
                .table-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 20px;
                    overflow-x: auto;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    border-radius: 8px;
                }
                .simple-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 14px;
                    color: #333;
                    background-color: #fff;
                }
                .simple-table th, .simple-table td {
                    border-bottom: 1px solid #eee;
                    padding: 16px;
                }
                .simple-table thead th {
                    background-color: #f4f6f8;
                    font-weight: 600;
                    color: #555;
                    text-transform: uppercase;
                    font-size: 12px;
                    letter-spacing: 0.5px;
                }
                .simple-table tbody tr:hover {
                    background-color: #fcfcfc;
                }
                .text-right {
                    text-align: right;
                }
                .highlight {
                    font-weight: 600;
                    color: #1976d2;
                }
            `}</style>

            <table className="simple-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Sections</th>
                        <th className="text-right">Total No. of Workers</th>
                        <th className="text-right">Total O/T Hours</th>
                        <th className="text-right">Average Labour Output</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading && (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                Loading labour output...
                            </td>
                        </tr>
                    )}

                    {!isLoading && error && (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                                {error}
                            </td>
                        </tr>
                    )}

                    {!isLoading && !error && groupedData.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                No records found.
                            </td>
                        </tr>
                    )}

                    {!isLoading && !error && groupedData.map(({ date, entries }) => {
                        const sections = entries.map(item => item.section).join(', ');
                        const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
                        const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
                        const avgLabourOutput = entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length;

                        return (
                            <tr key={date}>
                                <td>{date}</td>
                                <td>{sections}</td>
                                <td className="text-right">{totalWorkers}</td>
                                <td className="text-right">{totalOtHours.toFixed(2)}</td>
                                <td className="text-right highlight">{avgLabourOutput.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default LabourOutputTable;