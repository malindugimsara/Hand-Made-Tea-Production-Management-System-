import React, { useState } from 'react';

// Import the DatePicker you created
import { DatePicker } from '@/components/ui/date-picker';

// Import shadcn/ui alert-dialog
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function CostingForm() {
    // 1. Add state for the Date object (defaults to today)
    const [date, setDate] = useState(new Date());
    const [madeTea, setMadeTea] = useState('');
    
    // Expenses State
    const [rawMaterialCost, setRawMaterialCost] = useState(''); 
    const [selectionCost, setSelectionCost] = useState('');
    const [rollingCost, setRollingCost] = useState('');
    const [supervision, setSupervision] = useState('');
    const [electricity, setElectricity] = useState('');

    // Safely calculate totals
    const totalCost = 
        (Number(rawMaterialCost) || 0) + 
        (Number(selectionCost) || 0) + 
        (Number(rollingCost) || 0) + 
        (Number(supervision) || 0) + 
        (Number(electricity) || 0);
        
    // Prevent division by zero
    const costPerKg = Number(madeTea) > 0 ? (totalCost / Number(madeTea)).toFixed(2) : "0.00";

    const handleConfirmSave = () => {
        // Here you would put your API call
        alert(`Costing record for Rs. ${totalCost.toLocaleString()} saved successfully!`);
        
        // Clear form and reset date to today
        setDate(new Date()); 
        setMadeTea(''); setRawMaterialCost(''); setSelectionCost(''); 
        setRollingCost(''); setSupervision(''); setElectricity('');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-6">Cost Calculation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Input Form */}
                <form className="md:col-span-2 bg-[#FFFFFF] p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                            {/* 2. Replace the HTML input with the DatePicker component */}
                            <DatePicker 
                                date={date} 
                                setDate={setDate} 
                                label="Select costing date" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Made Tea Weight (kg)</label>
                            <input type="number" min="0" value={madeTea} onChange={e => setMadeTea(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="e.g. 5" />
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-[#1B6A31] border-b pb-2 mb-4">Expenses (Rs.)</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-md border border-green-100">
                            <label className="text-green-800 font-medium">🍃 Raw Material Cost (Leaves)</label>
                            <input type="number" min="0" value={rawMaterialCost} onChange={e => setRawMaterialCost(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="Rs." />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">🖐️ Selection Labor</label>
                            <input type="number" min="0" value={selectionCost} onChange={e => setSelectionCost(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="Rs." />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">🤲 Hand Rolling Labor</label>
                            <input type="number" min="0" value={rollingCost} onChange={e => setRollingCost(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="Rs." />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">👁️ Supervision</label>
                            <input type="number" min="0" value={supervision} onChange={e => setSupervision(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="Rs." />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">⚡ Electricity Cost</label>
                            <input type="number" min="0" value={electricity} onChange={e => setElectricity(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" placeholder="Rs." />
                        </div>
                    </div>
                </form>

                {/* Live Results Panel */}
                <div className="bg-[#1B6A31] text-white p-6 rounded-lg shadow-md flex flex-col justify-center h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>

                    <h3 className="text-xl font-bold mb-6 text-[#8CC63F] z-10">Summary</h3>
                    
                    <div className="mb-6 z-10">
                        <p className="text-sm opacity-80 mb-1">Total Production Cost</p>
                        <p className="text-4xl font-bold">Rs. {totalCost.toLocaleString()}</p>
                    </div>

                    <div className="z-10">
                        <p className="text-sm opacity-80 mb-1">Cost Per 1 kg</p>
                        <p className="text-3xl font-bold text-[#8CC63F]">Rs. {Number(costPerKg).toLocaleString()}</p>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button 
                                disabled={totalCost === 0 || !madeTea}
                                className="w-full mt-auto mt-8 py-3 bg-[#4A9E46] text-white rounded-md hover:bg-[#8CC63F] hover:text-[#1B6A31] transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            >
                                Save Costing
                            </button>
                        </AlertDialogTrigger>
                        
                        <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-[#1B6A31]">Confirm Cost Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to save this record? The total calculated production cost is <strong className="text-gray-900">Rs. {totalCost.toLocaleString()}</strong> for <strong className="text-gray-900">{madeTea} kg</strong> of tea.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmSave} className="bg-[#1B6A31] hover:bg-[#4A9E46] text-white">
                                    Confirm Save
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </div>
            </div>
        </div>
    );
}