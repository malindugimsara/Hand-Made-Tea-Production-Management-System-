import PackingStock from "../models/PackingStock.js";

export const deductPackingStock = async (baseGradeName, qty) => {
    let remaining = Number(qty);

    const stock = await PackingStock.findOne({
        productName: { $regex: new RegExp(`^${baseGradeName}$`, "i") }
    });

    if (!stock) return;

    stock.totalBulkStockKg -= remaining;
    if (stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;

    if (stock.stockBySource?.length) {

        for (const source of stock.stockBySource) {

            if (remaining <= 0) break;

            const available = source.quantityKg;

            if (available <= 0) continue;

            const deduct = Math.min(available, remaining);

            source.quantityKg -= deduct;
            source.issueAmount = (source.issueAmount || 0) + deduct;

            remaining -= deduct;
        }

        if (remaining > 0) {
            console.warn(
                `${baseGradeName} stock shortage (${remaining}kg)`
            );
        }
    }

    await stock.save();
};

export const restorePackingStock = async (baseGradeName, qty) => {

    const stock = await PackingStock.findOne({
        productName: { $regex: new RegExp(`^${baseGradeName}$`, "i") }
    });

    if (!stock) return;

    let remaining = Number(qty);

    stock.totalBulkStockKg += remaining;

    if (stock.stockBySource?.length) {

        let targetSource =
            stock.stockBySource.find(s => s.sourceName === "Factory") ||
            stock.stockBySource[0];

        targetSource.quantityKg += remaining;

        targetSource.issueAmount =
            Math.max(0, (targetSource.issueAmount || 0) - remaining);
    }

    await stock.save();
};