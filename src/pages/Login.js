import { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const login = async () => {
        try {
            const res = await api.post("/auth/login", form);

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            toast.success("Login successful");

            navigate("/dashboard");

        } catch (error) {
            toast.error(
                error.response?.data?.message || "Invalid Credentials"
            );
        }
    };

    return (
        <div className="container">

            <h2>Login</h2>

            <input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
            />

            <input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
            />

            <button onClick={login}>
                Login
            </button>
{/* 
            <Link to="/register">
                Create Account
            </Link> */}

        </div>
    );
}

export default Login;