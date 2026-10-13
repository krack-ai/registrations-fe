import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import './Login.css'

function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const login = async (e) => {
        e.preventDefault();

        if (!form.email || !form.password) {
            toast.error("Please enter email and password");
            return;
        }

        try {
            setLoading(true);

            const res = await api.post("/auth/login", form);

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            toast.success("Login successful");

            navigate("/dashboard");
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Invalid Credentials"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="login-header">
                    <div className="login-icon">
                        🔐
                    </div>

                    <h1>Welcome Back</h1>

                    <p>
                        Sign in to continue to your account
                    </p>
                </div>

                <form onSubmit={login} className="login-form">

                    <div className="form-group">
                        <label htmlFor="email">
                            Email Address
                        </label>

                        <div className="input-wrapper">
                            {/* <span className="input-icon">✉</span> */}

                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="input-wrapper">
                            {/* <span className="input-icon">🔒</span> */}

                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? "🙈" : "👁"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>

                </form>

                <div className="login-footer">
                    <p>
                        Secure login • Your information is protected
                    </p>
                </div>

            </div>
        </div>
    );
}

export default Login;