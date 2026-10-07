import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/api";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        techStack: "",
    });

    const [stats, setStats] = useState({
        totalCount: 0,
        dailyStats: []
    });

    const [selectedDate, setSelectedDate] = useState("");

    const loadStats = useCallback(async () => {
    try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            navigate("/");
            return;
        }

        const user = JSON.parse(storedUser);

        const res = await api.post("profile/stats", {
            email: user.email
        });

        setStats({
            totalCount: res.data.totalCount,
            dailyStats: res.data.dailyStats
        });

    } catch (error) {
        console.error(error);
        toast.error("Unable to load statistics");
    }
}, [navigate]);

   useEffect(() => {

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
        return;
    }

    setUser(JSON.parse(storedUser));

    loadStats();

}, [loadStats]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const updatedForm = {...form, submittedUser: user.email}
            await api.post("profile/submit", updatedForm);

            toast.success("Profile submitted successfully");

            setForm({
                fullName: "",
                email: "",
                phone: "",
                techStack: "",
                submittedUser: user.email
            });

            loadStats();

        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Failed to submit profile"
            );
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        toast.success("Logged out successfully");

        navigate("/");
    };

    const selectedDateCount = selectedDate
        ? stats.dailyStats.find(
            item => item.date === selectedDate
        )?.count || 0
        : 0;

    const today = new Date()
        .toISOString()
        .split("T")[0];

    const todayCount =
        stats.dailyStats.find(
            item => item.date === today
        )?.count || 0;

    if (!user) {
        return null;
    }

    return (
        <div className="dashboard-page">

            {/* NAVBAR */}

            <header className="dashboard-navbar">

                <div className="brand">
                    <div className="brand-logo">
                        K
                    </div>

                    <div>
                        <h2>Krack-AI</h2>
                        <span>Profile Manager</span>
                    </div>
                </div>

                <div className="nav-user">

                    <div className="user-info">
                        <div className="avatar">
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                        </div>

                        <div>
                            <strong>
                                {user.firstName} {user.lastName}
                            </strong>

                            <span>
                                {user.email}
                            </span>
                        </div>
                    </div>

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* MAIN */}

            <main className="dashboard-content">

                {/* PAGE TITLE */}

                <div className="page-heading">

                    <div>
                        <h1>
                            Dashboard
                        </h1>

                        <p>
                            Manage your profile submissions and track your activity.
                        </p>
                    </div>

                </div>


                {/* STAT CARDS */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon purple">
                            #
                        </div>

                        <div className="stat-content">

                            <span>
                                Total Profiles
                            </span>

                            <h2>
                                {stats.totalCount}
                            </h2>

                            <small>
                                All time submissions
                            </small>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon green">
                            ✓
                        </div>

                        <div className="stat-content">

                            <span>
                                Today's Submissions
                            </span>

                            <h2>
                                {todayCount}
                            </h2>

                            <small>
                                Submitted today
                            </small>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon blue">
                            📅
                        </div>

                        <div className="stat-content">

                            <span>
                                Selected Date
                            </span>

                            <h2>
                                {selectedDate
                                    ? selectedDateCount
                                    : "--"
                                }
                            </h2>

                            <small>
                                {selectedDate
                                    ? selectedDate
                                    : "Choose a date below"
                                }
                            </small>

                        </div>

                    </div>

                </section>


                {/* FORM */}

                <section className="content-card">

                    <div className="card-header">

                        <div>

                            <h2>
                                Submit Profile
                            </h2>

                            <p>
                                Enter the candidate details below.
                            </p>

                        </div>

                    </div>


                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-row">

                            <div className="form-field">

                                <label>
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    required
                                />

                            </div>


                            <div className="form-field">

                                <label>
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="Enter email address"
                                    required
                                />

                            </div>

                        </div>


                        <div className="form-row">

                            <div className="form-field">

                                <label>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    required
                                />

                            </div>


                            <div className="form-field">

                                <label>
                                    Tech Stack
                                </label>

                                <input
                                    type="text"
                                    name="techStack"
                                    value={form.techStack}
                                    onChange={handleChange}
                                    placeholder="React, Node.js, JavaScript"
                                    required
                                />

                            </div>

                        </div>


                        <div className="form-actions">

                            <button
                                type="submit"
                                className="submit-button"
                            >
                                Submit Profile
                            </button>

                        </div>

                    </form>

                </section>


                {/* HISTORY */}

                <section className="content-card">

                    <div className="history-header">

                        <div>

                            <h2>
                                Submission History
                            </h2>

                            <p>
                                View your profile submission activity.
                            </p>

                        </div>


                        <div className="date-filter">

                            <label>
                                Filter by date
                            </label>

                            <div className="date-controls">

                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                />

                                {selectedDate && (
                                    <button
                                        onClick={() =>
                                            setSelectedDate("")
                                        }
                                    >
                                        Clear
                                    </button>
                                )}

                            </div>

                        </div>

                    </div>


                    <div className="table-wrapper">

                        <table className="history-table">

                            <thead>

                                <tr>
                                    <th>Date</th>
                                    <th>Profiles Submitted</th>
                                </tr>

                            </thead>

                            <tbody>

                                {stats.dailyStats
                                    .filter(item =>
                                        !selectedDate ||
                                        item.date === selectedDate
                                    )
                                    .map(item => (

                                        <tr key={item.date}>

                                            <td>
                                                {new Date(
                                                    item.date + "T00:00:00"
                                                ).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric"
                                                    }
                                                )}
                                            </td>

                                            <td>

                                                <span className="count-badge">
                                                    {item.count}
                                                </span>

                                            </td>

                                        </tr>

                                    ))}


                                {stats.dailyStats.filter(item =>
                                    !selectedDate ||
                                    item.date === selectedDate
                                ).length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="2"
                                            className="empty-state"
                                        >
                                            No submissions found.
                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Dashboard;