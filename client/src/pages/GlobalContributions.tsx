import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, EyeIcon, TrashIcon, DocumentTextIcon, CalendarIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import ContributionForm from '../components/ContributionForm';

interface Contribution {
  id: string;
  title: string;
  accountName: string;
  saleName: string;
  saleEmail: string;
  contributionType: string;
  impact: string;
  effort: string;
  estimatedImpactValue?: number;
  description: string;
  contributionMonth: string;
  tags: string[];
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
  userName: string;
  tenantName: string;
  tenantPrefix: string;
}

export default function GlobalContributions() {
  const { t } = useLanguage();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterTenant, setFilterTenant] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterImpact, setFilterImpact] = useState<string>('');

  // Load contributions from API
  useEffect(() => {
    loadContributions();
  }, []);

  const loadContributions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGlobalContributions();
      if (response.success) {
        setContributions(response.data);
      } else {
        console.error('Failed to load contributions:', response.message);
        toast.error('Failed to load contributions');
      }
    } catch (error: any) {
      console.error('Error loading contributions:', error);
      if (error.message === 'Unauthorized - Please login again') {
        toast.error('Session expired. Please login again.');
        // Redirect to login
        window.location.href = '/login';
      } else {
        toast.error('Failed to load contributions');
      }
    } finally {
      setLoading(false);
    }
  };

  const getContributionTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'solution_architecture': 'Solution Architecture',
      'technical_consultation': 'Technical Consultation',
      'proof_of_concept': 'Proof of Concept',
      'requirement_analysis': 'Requirement Analysis',
      'vendor_evaluation': 'Vendor Evaluation',
      'cost_optimization': 'Cost Optimization',
      'performance_improvement': 'Performance Improvement',
      'security_assessment': 'Security Assessment',
      'compliance_review': 'Compliance Review',
      'training_workshop': 'Training & Workshop',
      'project_management': 'Project Management',
      'other': 'อื่นๆ'
    };
    return typeMap[type] || type;
  };

  const getImpactLevelBadge = (level: string) => {
    const levelMap: { [key: string]: { label: string; color: string } } = {
      'low': { label: 'ต่ำ', color: 'bg-gray-100 text-gray-800' },
      'medium': { label: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-800' },
      'high': { label: 'สูง', color: 'bg-orange-100 text-orange-800' },
      'critical': { label: 'วิกฤต', color: 'bg-red-100 text-red-800' }
    };
    const config = levelMap[level] || { label: level, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
      'submitted': { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
      'approved': { label: 'Approved', color: 'bg-green-100 text-green-800' },
      'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleCreateContribution = async (data: any, action: 'draft' | 'submit') => {
    try {
      // Use status from data if available, otherwise use action
      const finalStatus = data.status || (action === 'draft' ? 'draft' : 'submitted');
      
      // Transform data to match API expectations
      const apiData = {
        accountName: data.accountName,
        saleName: data.saleName,
        saleEmail: data.saleEmail,
        contributionType: data.contributionType,
        title: data.title,
        description: data.description,
        impact: data.impact,
        effort: data.effort,
        estimatedImpactValue: data.estimatedImpactValue,
        contributionMonth: data.contributionMonth,
        tags: data.tags || [],
        status: finalStatus
      };

      console.log('🔍 Frontend - Create Contribution Debug:', {
        action: action,
        dataStatus: data.status,
        finalStatus: finalStatus,
        apiStatus: apiData.status,
        isDraft: action === 'draft',
        fullApiData: apiData
      });

      // For global admin, we need to specify which tenant to create the contribution in
      // This is a simplified approach - in a real app, you'd have a tenant selector
      // For now, we'll use the first available tenant or default
      const response = await apiService.createContribution(apiData);
      if (response.success) {
        await loadContributions(); // Reload from API
        setShowForm(false);
        toast.success(action === 'draft' ? 'Draft saved successfully' : 'Contribution submitted successfully');
      } else {
        toast.error(response.message || 'Failed to create contribution');
      }
    } catch (error: any) {
      console.error('Error creating contribution:', error);
      toast.error(error.message || 'Failed to create contribution');
    }
  };

  const handleDeleteContribution = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contribution?')) {
      try {
        // For global admin, we need to use the tenant-specific API
        // This is a simplified approach - in a real app, you'd determine the tenant from the contribution
        const response = await apiService.deleteContribution(id);
        if (response.success) {
          await loadContributions(); // Reload from API
          toast.success('Contribution deleted successfully');
        } else {
          toast.error(response.message || 'Failed to delete contribution');
        }
      } catch (error: any) {
        console.error('Error deleting contribution:', error);
        toast.error(error.message || 'Failed to delete contribution');
      }
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      // For global admin, we need to use the tenant-specific API
      // This is a simplified approach - in a real app, you'd determine the tenant from the contribution
      const response = await apiService.submitContribution(id);
      if (response.success) {
        await loadContributions(); // Reload from API
        toast.success('Contribution submitted for approval');
      } else {
        toast.error(response.message || 'Failed to submit contribution');
      }
    } catch (error: any) {
      console.error('Error submitting contribution:', error);
      toast.error(error.message || 'Failed to submit contribution');
    }
  };

  // Filter contributions based on current filters
  const filteredContributions = contributions.filter(contribution => {
    if (filterTenant && contribution.tenantName !== filterTenant) return false;
    if (filterStatus && contribution.status !== filterStatus) return false;
    if (filterImpact && contribution.impact !== filterImpact) return false;
    return true;
  });

  const stats = {
    total: filteredContributions.length,
    pending: filteredContributions.filter(c => c.status === 'submitted').length,
    draft: filteredContributions.filter(c => c.status === 'draft').length
  };

  // Get unique tenants for filter
  const tenants = Array.from(new Set(contributions.map(c => c.tenantName))).sort();

  // Memoize onSubmit to prevent re-renders
  const memoizedOnSubmit = useCallback((data: any, action: 'draft' | 'submit') => {
    return handleCreateContribution(data, action);
  }, [handleCreateContribution]);

  // Memoize onCancel to prevent re-renders
  const memoizedOnCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Contributions</h1>
              <p className="mt-2 text-gray-600">
                View and manage contributions across all tenants
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Contribution
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.draft}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Tenants</dt>
                      <dd className="text-lg font-medium text-gray-900">{tenants.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
              <select
                value={filterTenant}
                onChange={(e) => setFilterTenant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant} value={tenant}>{tenant}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Impact Level</label>
              <select
                value={filterImpact}
                onChange={(e) => setFilterImpact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Impact Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contributions Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Global Contributions List
            </h3>
          </div>
          
          {filteredContributions.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No contributions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No contributions match your current filters.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create New Contribution
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredContributions.map((contribution) => (
                <li key={contribution.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {contribution.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          {getImpactLevelBadge(contribution.impact)}
                          {getStatusBadge(contribution.status)}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                          {contribution.accountName}
                        </div>
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1" />
                          {contribution.saleName} ({contribution.saleEmail})
                        </div>
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          {getContributionTypeLabel(contribution.contributionType)}
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {contribution.contributionMonth ? 
                            new Date(contribution.contributionMonth + '-01').toLocaleDateString('th-TH', { 
                              year: 'numeric', 
                              month: 'long' 
                            }) : 
                            '-'
                          }
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <span className="font-medium">Tenant:</span>
                          <span className="ml-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {contribution.tenantName} ({contribution.tenantPrefix})
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">User:</span>
                          <span className="ml-1">{contribution.userName}</span>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {contribution.description}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedContribution(contribution);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="ดูรายละเอียด"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      
                      {contribution.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSubmitForApproval(contribution.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            title="Submit"
                          >
                            Submit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteContribution(contribution.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Contribution Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-0 mx-auto p-5 w-full max-w-6xl">
            <div className="relative bg-white rounded-lg shadow-xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => {
                    setShowForm(false);
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <span className="sr-only">ปิด</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              
            <ContributionForm
                user={{
                  fullName: 'Global Admin',
                  staffId: 'GLOBAL',
                  involvedAccountNames: [],
                  involvedSaleNames: [],
                  involvedSaleEmails: []
                }}
                onSubmit={memoizedOnSubmit}       
                onCancel={memoizedOnCancel}       
            />
              
            </div>
          </div>
        </div>
      )}

      {/* View Contribution Modal - Mock Mode */}
      {showViewModal && selectedContribution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 w-full max-w-4xl">
            <div className="relative bg-white rounded-lg shadow-xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedContribution(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">ปิด</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedContribution.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Account:</strong> {selectedContribution.accountName}</p>
                    <p><strong>Sale:</strong> {selectedContribution.saleName} ({selectedContribution.saleEmail})</p>
                    <p><strong>Type:</strong> {getContributionTypeLabel(selectedContribution.contributionType)}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedContribution.status)}</p>
                  </div>
                  <div>
                    <p><strong>Impact:</strong> {getImpactLevelBadge(selectedContribution.impact)}</p>
                    <p><strong>Effort:</strong> {selectedContribution.effort}</p>
                    <p><strong>Month:</strong> {selectedContribution.contributionMonth ? 
                      new Date(selectedContribution.contributionMonth + '-01').toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long' 
                      }) : 
                      '-'
                    }</p>
                    <p><strong>Tenant:</strong> {selectedContribution.tenantName} ({selectedContribution.tenantPrefix})</p>
                    <p><strong>User:</strong> {selectedContribution.userName}</p>
                    {selectedContribution.estimatedImpactValue && (
                      <p><strong>Impact Value:</strong> ฿{selectedContribution.estimatedImpactValue.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <p><strong>Description:</strong></p>
                  <p className="text-gray-600 mt-1">{selectedContribution.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}