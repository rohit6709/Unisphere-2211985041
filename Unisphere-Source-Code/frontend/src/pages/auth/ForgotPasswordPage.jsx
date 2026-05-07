import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { forgotAdminPassword, forgotFacultyPassword, forgotStudentPassword } from '@/services/authService';

const forgotByRole = {
	student: forgotStudentPassword,
	faculty: forgotFacultyPassword,
	admin: forgotAdminPassword,
};

export default function ForgotPasswordPage() {
	const [email, setEmail] = React.useState('');
	const [role, setRole] = React.useState('student');

	const mutation = useMutation({
		mutationFn: () => forgotByRole[role]({ email }),
		onSuccess: () => toast.success('Password reset instructions sent to email'),
		onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to request password reset'),
	});

	return (
		<div className="mx-auto max-w-md px-4 py-12">
			<div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your account email to receive reset instructions.</p>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						mutation.mutate();
					}}
					className="mt-6 space-y-4"
				>
					<select
						value={role}
						onChange={(event) => setRole(event.target.value)}
						className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
					>
						<option value="student">Student</option>
						<option value="faculty">Faculty</option>
						<option value="admin">Admin</option>
					</select>

					<Input
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="Email"
						required
					/>

					<div className="flex items-center gap-3">
						<Button type="submit" isLoading={mutation.isPending}>Send Reset Link</Button>
						<Link to="/login" className="text-sm font-semibold text-indigo-600 hover:underline">Back to Login</Link>
					</div>
				</form>
			</div>
		</div>
	);
}

