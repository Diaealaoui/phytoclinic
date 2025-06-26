// src/pages/UserManagementPage.tsx - Delete Functionality Removed

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label is still imported, though not directly used in the component's current structure
import { Label } from '@/components/ui/label'; 
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// AlertDialog and related components are removed as they are only for delete
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, Search, Loader2, /* Trash2, */ Edit, Shield, ShieldCheck } from 'lucide-react'; // Trash2 icon removed

// Define the User interface based on your 'users' table schema
interface User {
  id: string;
  email: string;
  name: string | null;
  user_type: 'admin' | 'client';
  created_at: string;
  updated_at?: string; // Kept as optional, if it's consistently null, consider removing
}

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // Supabase auth.user object
  // userToDelete state removed
  // const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Get current authenticated user to prevent self-modification
  useEffect(() => {
    const getCurrentUser = async () => {
      console.log('Fetching current authenticated user for self-protection...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching current user:', error);
      }
      setCurrentUser(user);
      console.log('Current user set:', user?.email);
    };
    getCurrentUser();
  }, []);

  // Memoized fetchUsers function to load all users from the public.users table
  const fetchUsers = useCallback(async () => {
    console.log('🔄 fetchUsers called to retrieve all users from DB!');
    setLoading(true);
    try {
      // Corrected .select() to directly query columns from your public.users table
      const { data, error } = await supabase
        .from('users') // Targets your public.users table
        .select('id, email, name, user_type, created_at') // Selects these columns directly
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user data: ' + error.message,
          variant: 'destructive',
        });
        return;
      }

      const usersData = data as User[] || [];
      console.log('UserManagementPage: Raw data received from fetch:', JSON.stringify(data));
      setUsers(usersData);
      console.log('UserManagementPage: ✅ Users data received and state updated. Number of users:', usersData.length);

    } catch (error: any) {
      console.error('❌ Fetch error in fetchUsers:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading users.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Depend on toast if it's not a stable reference

  // Effect hook to run fetchUsers on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Re-run if fetchUsers function itself changes (due to useCallback deps)

  // Effect hook to filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users); // If search term is empty, show all users
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = users.filter(user =>
        (user.name?.toLowerCase().includes(searchLower) || false) || // Check name (handles null)
        (user.email?.toLowerCase().includes(searchLower) || false) || // Check email (handles null)
        user.user_type.toLowerCase().includes(searchLower) // Check user type
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]); // Re-filter whenever users data or search term changes

  // Function to update a user's type (admin/client)
  const updateUserType = async (userId: string, newType: 'admin' | 'client') => {
    // Prevent self-modification of user type
    if (currentUser?.id === userId) {
      toast({
        title: 'Action Not Allowed',
        description: 'You cannot change your own user type directly from here.',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingUserId(userId); // Set loading state for this specific user's row
    console.log(`UserManagementPage: Attempting to update user ${userId} to type ${newType}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          user_type: newType,
          // Removed updated_at as per schema
        })
        .eq('id', userId);

      if (error) {
        throw error; // Propagate error to catch block
      }

      console.log(`UserManagementPage: User ${userId} type update successful.`);
      // Optimistic UI update: Update the local state immediately for responsiveness
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId 
            ? { ...user, user_type: newType } 
            : user
        )
      );

      // Get user name for toast message
      const userName = users.find(u => u.id === userId)?.name || 
                       users.find(u => u.id === userId)?.email || 
                       'Unknown User';

      toast({
        title: 'Success!',
        description: `User type for ${userName} updated to "${newType}".`,
      });

    } catch (error: any) {
      console.error('UserManagementPage: ❌ Error updating user type:', error);
      // On error, re-fetch from DB to ensure local state consistency
      await fetchUsers(); 
      toast({
        title: 'Update Failed',
        description: `Failed to update user type: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null); // Clear loading state
    }
  };

  // The handleDeleteUser function is entirely removed as per request
  // const handleDeleteUser = async () => { ... }

  // Helper function to format date strings for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date'; // Return graceful error for invalid dates
    }
  };

  // Helper function to get an icon based on user type
  const getUserTypeIcon = (userType: 'admin' | 'client') => {
    return userType === 'admin' ? (
      <ShieldCheck className="w-4 h-4 text-red-600" />
    ) : (
      <User className="w-4 h-4 text-blue-600" />
    );
  };

  // Helper function to get a badge based on user type
  const getUserTypeBadge = (userType: 'admin' | 'client') => {
    return userType === 'admin' ? (
      <Badge variant="destructive" className="gap-1">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <User className="w-3 h-3" />
        Client
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-6xl mx-auto">
        {/* Back to Dashboard Button */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 bg-white/80 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Main User Management Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              User Management
              <Badge variant="outline" className="ml-auto">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Manage user accounts, update roles, and review access permissions.
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Search Input and Quick Stats */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or user type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Quick Stats Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Users</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Admins</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {users.filter(u => u.user_type === 'admin').length}
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Clients</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.user_type === 'client').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content: Loading, No Users, or User Table */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">
                  {searchTerm ? 'Try adjusting your search criteria' : 'No users exist in the system'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">User Details</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Joined</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getUserTypeIcon(user.user_type)}
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.name || 'No name set'}
                              </p>
                              {currentUser?.id === user.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-gray-600">{user.email}</span>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getUserTypeBadge(user.user_type)}
                            <Select
                              value={user.user_type}
                              onValueChange={(value: 'admin' | 'client') =>
                                updateUserType(user.id, value)
                              }
                              disabled={updatingUserId === user.id || currentUser?.id === user.id}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="client">Client</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {/* Delete button and AlertDialog removed */}
                          {/* You can add back a delete button here if you want to re-implement it later */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true} // Always disabled as delete logic is removed
                            className="ml-2"
                          >
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementPage;