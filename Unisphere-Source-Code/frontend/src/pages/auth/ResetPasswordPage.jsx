import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { resetAdminPassword, resetFacultyPassword, resetStudentPassword } from '@/services/authService';

const resetByRole = {
	student: resetStudentPassword,
	faculty: resetFacultyPassword,
	admin: resetAdminPassword,
};

export default function ResetPasswordPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { token: tokenParam } = useParams();
	const role = searchParams.get('role') || 'student';
	const token = tokenParam || searchParams.get('token') || '';

	const [form, setForm] = React.useState({
		newPassword: '',
		confirmPassword: '',
	});

	const mutation = useMutation({
		mutationFn: () => resetByRole[role](token, form),
		onSuccess: () => {
			toast.success('Password reset successful. You can log in now.');
			setForm({ newPassword: '', confirmPassword: '' });
			setTimeout(() => {
				navigate('/login');
			}, 1500);
		},
		onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to reset password'),
	});

	const isValidRole = Boolean(resetByRole[role]);

	return (
		<div className="mx-auto max-w-md px-4 py-12">
			<div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Set a new password for your account.</p>

				{(!token || !isValidRole) ? (
					<div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
						Invalid reset link.
					</div>
				) : (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (form.newPassword.length < 6) {
								toast.error('Password must be at least 6 characters');
								return;
							}
							if (form.newPassword !== form.confirmPassword) {
								toast.error('Passwords do not match');
								return;
							}
							mutation.mutate();
						}}
						className="mt-6 space-y-4"
					>
						<Input
							type="password"
							placeholder="New password"
							value={form.newPassword}
							onChange={(event) => setForm((state) => ({ ...state, newPassword: event.target.value }))}
							required
						/>
						<Input
							type="password"
							placeholder="Confirm password"
							value={form.confirmPassword}
							onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))}
							required
						/>

						<div className="flex items-center gap-3">
							<Button type="submit" isLoading={mutation.isPending}>Reset Password</Button>
							<Link to="/login" className="text-sm font-semibold text-indigo-600 hover:underline">Back to Login</Link>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}

