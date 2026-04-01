import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
 
export default function DailyRecordsView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate(); 
    useEffect(() => {
        fetchMergedRecords();
    }, []);

    const fetchMergedRecords = async () => {
        try {
            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`),
                fetch(`${BACKEND_URL}/api/labour`)
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) throw new Error("Failed to fetch data");

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const mergedData = greenLeafData.map(gl => {
                const dateStr = new Date(gl.date).toISOString().split('T')[0];
                const prod = productionData.find(p => new Date(p.date).toISOString().split('T')[0] === dateStr);
                const lab = labourData.find(l => new Date(l.date).toISOString().split('T')[0] === dateStr);
                
                return {
                    date: dateStr,
                    greenLeafId: gl._id,
                    productionId: prod ? prod._id : null,
                    labourId: lab ? lab._id : null,
                    totalWeight: gl.totalWeight,
                    selectedWeight: gl.selectedWeight,
                    returnedWeight: gl.returnedWeight,
                    teaType: prod ? prod.teaType : '',
                    madeTeaWeight: prod ? prod.madeTeaWeight : '',
                    dryerName: prod?.dryerDetails?.dryerName || '',
                    meterStart: prod?.dryerDetails?.meterStart || '',
                    meterEnd: prod?.dryerDetails?.meterEnd || '',
                    units: prod?.dryerDetails?.units || '',
                    workerCount: lab ? lab.workerCount : ''
                };
            });

            mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(mergedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (greenLeafId, productionId, labourId, recordDate) => {
        if (window.confirm(`Are you sure you want to delete the record for ${recordDate}?`)) {
            const toastId = toast.loading('Deleting record...');
            try {
                const promises = [];
                if (greenLeafId) promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${greenLeafId}`, { method: 'DELETE' }));
                if (productionId) promises.push(fetch(`${BACKEND_URL}/api/production/${productionId}`, { method: 'DELETE' }));
                if (labourId) promises.push(fetch(`${BACKEND_URL}/api/labour/${labourId}`, { method: 'DELETE' }));

                await Promise.all(promises);
                toast.success("Record deleted successfully!", { id: toastId });
                fetchMergedRecords(); 
            } catch (error) {
                console.error("Delete Error:", error);
                toast.error("Failed to delete record.", { id: toastId });
            }
        }
    };


    const goToEditPage = (record) => {
        navigate('/edit-record', { state: { recordData: record } });
    };

    return (
        <div className="p-8 max-w-[1500px] mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31]">Daily Production Log</h2>
                    <p className="text-gray-500 mt-2">Digital representation of the Hand Made Tea Factory Record Book</p>
                </div>
                <button onClick={fetchMergedRecords} className="px-4 py-2 bg-[#1B6A31] hover:bg-[#4A9E46] text-white rounded-md font-semibold transition-colors flex items-center gap-2 shadow-sm">
                    🔄 Refresh Data
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 font-semibold text-lg">Loading production records...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th rowSpan="2" className="p-3 border-r border-gray-200 bg-gray-100 text-gray-800 font-bold align-middle">Date</th>
                                    <th colSpan="2" className="p-2 border-r border-gray-200 bg-[#E8F5E9] text-[#1B6A31] font-bold">Received green leaf</th>
                                    <th rowSpan="2" className="p-3 border-r border-gray-200 bg-gray-100 text-gray-800 font-bold align-middle leading-tight">Return to <br/>main factory</th>
                                    <th colSpan="2" className="p-2 border-r border-gray-200 bg-purple-100 text-purple-800 font-bold">Made Tea</th>
                                    <th colSpan="4" className="p-2 border-r border-gray-200 bg-orange-100 text-orange-800 font-bold">Meter Reading (dryer)</th>
                                    <th rowSpan="2" className="p-3 border-r border-gray-200 bg-blue-100 text-blue-800 font-bold align-middle leading-tight">Labour<br/>(Count)</th>
                                    <th rowSpan="2" className="p-3 bg-gray-100 text-gray-800 font-bold align-middle">Action</th>
                                </tr>
                                <tr className="border-b-2 border-gray-300 text-sm">
                                    <th className="p-2 border-r border-gray-200 bg-[#F1F8F1] text-[#2E7D32] font-semibold">Total(kg)</th>
                                    <th className="p-2 border-r border-gray-200 bg-[#F1F8F1] text-[#2E7D32] font-semibold">Selected (kg)</th>
                                    <th className="p-2 border-r border-gray-200 bg-purple-50 text-purple-700 font-semibold">Type</th>
                                    <th className="p-2 border-r border-gray-200 bg-purple-50 text-purple-700 font-semibold">(kg)</th>
                                    <th className="p-2 border-r border-gray-200 bg-orange-50 text-orange-700 font-semibold">Dryer</th>
                                    <th className="p-2 border-r border-gray-200 bg-orange-50 text-orange-700 font-semibold">start</th>
                                    <th className="p-2 border-r border-gray-200 bg-orange-50 text-orange-700 font-semibold">end</th>
                                    <th className="p-2 border-r border-gray-200 bg-orange-50 text-orange-700 font-bold">points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length > 0 ? (
                                    records.map((record) => (
                                        <tr key={record.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 border-r border-gray-100 font-semibold text-gray-700">{record.date}</td>
                                            <td className="p-3 border-r border-gray-100 text-gray-700">{record.totalWeight}</td>
                                            <td className="p-3 border-r border-gray-100 font-bold text-[#4A9E46]">{record.selectedWeight}</td>
                                            <td className="p-3 border-r border-gray-100 text-gray-700 bg-gray-50/50">{record.returnedWeight}</td>
                                            <td className="p-3 border-r border-gray-100 font-medium text-purple-700">{record.teaType}</td>
                                            <td className="p-3 border-r border-gray-100 font-bold text-purple-800">{record.madeTeaWeight}</td>
                                            <td className="p-3 border-r border-gray-100 font-medium text-orange-700">{record.dryerName}</td>
                                            <td className="p-3 border-r border-gray-100 text-gray-600">{record.meterStart}</td>
                                            <td className="p-3 border-r border-gray-100 text-gray-600">{record.meterEnd}</td>
                                            <td className="p-3 border-r border-gray-100 font-bold text-orange-600 bg-orange-50/30">{record.units}</td>
                                            <td className="p-3 border-r border-gray-100 font-bold text-blue-700 bg-blue-50/50">{record.workerCount}</td>
                                            <td className="p-3 flex justify-center gap-2">
                                                <button onClick={() => goToEditPage(record)} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-semibold rounded border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors">
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(record.greenLeafId, record.productionId, record.labourId, record.date)} className="px-3 py-1 bg-red-50 text-red-600 text-sm font-semibold rounded border border-red-200 hover:bg-red-600 hover:text-white transition-colors">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="12" className="p-10 text-center text-gray-500 text-lg">No daily records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}