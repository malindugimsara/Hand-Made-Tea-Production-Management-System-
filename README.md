# 🍃 Hand-Made Tea Production Management System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

A comprehensive, full-stack web application designed to digitize, streamline, and manage the end-to-end production workflow of a Hand-Made Tea Factory. From tracking daily green leaf intakes to managing complex packing material inventories and generating highly formatted operational reports.

## 📋 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Key Modules Overview](#-key-modules-overview)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 About the Project

The **Hand-Made Tea Production Management System (UMS)** eliminates manual ledger keeping by providing a centralized dashboard for factory admins and officers. It ensures accurate real-time tracking of Green Leaf (G/L) inputs, Made Tea (M/T) outputs, dispatch logs, and dynamic inventory balances for raw materials and spices.

## ✨ Key Features

- **📊 Comprehensive Factory Logs:** Track daily Green Leaf vs. Made Tea conversions, dispatches, local sales, and running factory balances.
- **🍃 Loft Leaf Quality Tracking:** Monitor daily leaf quality by grading intakes into *Best*, *Below Best*, and *Poor* percentages.
- **📦 Advanced Inventory Management:** Categorized real-time stock tracking for:
  - **Tea Products** (BOPF, PEKOE, Green, White, Silver, etc.)
  - **Spicy Stock** (Flavors, Spices)
  - **Packing Materials** (Pouches, Boxes, Labels, Tape)
- **📑 Professional Reporting Engine:** Generate deeply customized, multi-colored PDF reports (`jspdf-autotable`) and highly formatted Excel spreadsheets (`xlsx-js-style`) with merged headers and zebra striping.
- **🔐 Role-Based Access Control (RBAC):** Restrict sensitive actions (Edit/Delete) based on user roles (e.g., Admin vs. Viewer).
- **📅 Dynamic Range Filtering:** Filter data and generate reports across specific months or custom date ranges seamlessly.

---

## 🛠 Tech Stack

**Frontend:**
- [React.js](https://reactjs.org/) (Hooks, Context API)
- [Vite](https://vitejs.dev/) (Build Tool)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/) (UI Icons)
- [React Hot Toast](https://react-hot-toast.com/) (Notifications)

**Export & Reporting:**
- [jsPDF](https://github.com/parallax/jsPDF) & [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) (PDF Generation)
- [XLSX-JS-Style](https://github.com/gitbrent/xlsx-js-style) (Excel Generation & Styling)

**Backend (Inferred API):**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT) for Authentication

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/) installed on your machine.

### 1. Clone the repository
```bash
git clone [https://github.com/malindugimsara/Hand-Made-Tea-Production-Management-System-.git](https://github.com/malindugimsara/Hand-Made-Tea-Production-Management-System-.git)
cd Hand-Made-Tea-Production-Management-System-
