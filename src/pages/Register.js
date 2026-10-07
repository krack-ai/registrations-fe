import { useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Register() {

    const navigate = useNavigate();

   const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: ""
});

    const handleChange = e => {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    };

    const register = async () => {

        try {

            await api.post("/auth/register", form);

            toast.success("Registration Successful");

            navigate("/");

        } catch (err) {

            toast.error(err.response.data.message);

        }

    };

    return (

       <div className="container">

    <h2>Register</h2>

    <input
        name="firstName"
        placeholder="First Name"
        value={form.firstName}
        onChange={handleChange}
    />

    <input
        name="lastName"
        placeholder="Last Name"
        value={form.lastName}
        onChange={handleChange}
    />

    <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
    />

    <input
        name="phone"
        type="tel"
        placeholder="Phone Number"
        value={form.phone}
        onChange={handleChange}
    />

    <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
    />

    <button onClick={register}>
        Register
    </button>

    <Link to="/">Already have an account? Login</Link>

</div>
    );

}

export default Register;