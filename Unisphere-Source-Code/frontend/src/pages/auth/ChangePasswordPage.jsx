import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { changeAdminPassword, changeFacultyPassword, changeStudentPassword } from '@/services/authService';

const getPasswordChangeRequest = (role) => {
	if (role === 'admin' || role === 'superadmin') return changeAdminPassword;
	if (role === 'faculty' || role === 'hod') return changeFacultyPassword;
	return changeStudentPassword;
};

export default function ChangePasswordPage() {
	const navigate = useNavigate();
	const { role } = useAuth();
	const [form, setForm] = React.useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const mutation = useMutation({
		mutationFn: () => getPasswordChangeRequest(role)(form),
		onSuccess: () => {
			toast.success('Password changed successfully');
			setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
			navigate(-1);
		},
		onError: (error) => {
			toast.error(error?.response?.data?.message || error?.message || 'Failed to change password');
		},
	});

	const handleSubmit = (event) => {
		event.preventDefault();
		if (form.newPassword.length < 6) {
			toast.error('New password must be at least 6 characters');
			return;
		}
		if (form.newPassword !== form.confirmPassword) {
			toast.error('Passwords do not match');
			return;
		}
		mutation.mutate();
	};

	return (
		<div className="mx-auto max-w-md px-4 py-12">
			<div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Update your account password securely.</p>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<Input
						type="password"
						placeholder="Current password"
						value={form.currentPassword}
						onChange={(event) => setForm((state) => ({ ...state, currentPassword: event.target.value }))}
						required
					/>
					<Input
						type="password"
						placeholder="New password"
						value={form.newPassword}
						onChange={(event) => setForm((state) => ({ ...state, newPassword: event.target.value }))}
						required
					/>
					<Input
						type="password"
						placeholder="Confirm new password"
						value={form.confirmPassword}
						onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))}
						required
					/>

					<div className="flex items-center gap-3 pt-2">
						<Button type="submit" isLoading={mutation.isPending}>Save Password</Button>
						<Link to="/login" className="text-sm font-semibold text-indigo-600 hover:underline">Go to Login</Link>
					</div>
				</form>
			</div>
		</div>
	);
}

