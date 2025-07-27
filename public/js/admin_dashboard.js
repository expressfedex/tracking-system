document.addEventListener('DOMContentLoaded', function() {
    // --- Global Variables and Element References ---
    const token = localStorage.getItem('token');
    const adminPanel = document.getElementById('admin-panel');
    const loginSection = document.getElementById('login-section');
    const logoutButton = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // Dashboard Elements
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Tracking Management Elements
    const addTrackingForm = document.getElementById('addTrackingForm');
    const trackingTableBody = document.getElementById('trackingTableBody');
    const updateTrackingIdSelect = document.getElementById('updateTrackingIdSelect');
    const deleteTrackingIdSelect = document.getElementById('deleteTrackingIdSelect');
    const updateTrackingForm = document.getElementById('updateTrackingForm');
    const updateTrackingMongoId = document.getElementById('updateTrackingMongoId'); // Hidden input for _id
    const updateStatusInput = document.getElementById('updateStatus');
    const updateIsBlinkingOriginal = document.getElementById('updateIsBlinkingOriginal');
    const updateStatusLineColor = document.getElementById('updateStatusLineColor');
    const updateBlinkingDotColor = document.getElementById('updateBlinkingDotColor');

    // Tracking History Elements
    const trackingHistorySection = document.getElementById('tracking-history-section');
    const trackingHistoryList = document.getElementById('trackingHistoryList');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const editHistoryModal = document.getElementById('editHistoryModal');
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');
    const editHistoryModalTrackingMongoId = document.getElementById('editHistoryModalTrackingMongoId');
    const editHistoryModalHistoryId = document.getElementById('editHistoryModalHistoryId');
    const editHistoryDate = document.getElementById('editHistoryDate');
    const editHistoryTime = document.getElementById('editHistoryTime');
    const editHistoryLocation = document.getElementById('editHistoryLocation');
    const editHistoryDescription = document.getElementById('editHistoryDescription');

    // Email Notification Elements
    const sendEmailForm = document.getElementById('sendEmailForm');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');

    // File Upload Elements
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // User Management Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const createUserForm = document.getElementById('createUserForm');
    const createUserModal = document.getElementById('createUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete'); // Span to display username
    const deleteUserModalTrigger = document.getElementById('deleteUserModal'); // The delete user confirmation modal


    // --- Authentication and Authorization Check ---
    function checkAuth() {
        if (token) {
            // Token exists, assume logged in for now, show admin panel
            if (adminPanel) adminPanel.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
        } else {
            // No token, redirect to login
            console.log('No token found, redirecting to login.');
            if (adminPanel) adminPanel.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
            window.location.href = 'admin_login.html';
        }
    }

    // Call checkAuth on page load
    checkAuth();

    // --- Navigation and Section Display ---
    function showSection(sectionId) {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.style.display = 'block';
        }

        // Specific actions for each section
        if (sectionId === 'trackings-section') {
            fetchAllTrackings();
            fetchTrackingIdsForSelect(); // Refresh dropdowns when going to tracking section
            updateTrackingForm.style.display = 'none'; // Hide the update form initially
        } else if (sectionId === 'users-section') {
            fetchAllUsers();
        } else if (sectionId === 'dashboard-section') {
            fetchAllTrackings(); // Re-fetch to update dashboard stats
        }
        M.Modal.init(document.querySelectorAll('.modal')); // Re-initialize modals for new content
    }

    // Attach click listeners to sidebar navigation links
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            if (targetSection) {
                showSection(targetSection);
                if (sidebar) sidebar.classList.remove('active'); // Hide sidebar on mobile
            }
        });
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('token');
            // M.toast({ html: 'Logged out successfully!', classes: 'green darken-2' }); // Toast requires M to be initialized
            window.location.href = 'admin_login.html';
        });
    }

    // --- Tracking Management Functions ---

    // Fetch All Trackings (for table and dashboard stats)
    function fetchAllTrackings() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching trackings');
                });
            }
            return response.json();
        })
        .then(trackings => {
            updateDashboardStats(trackings); // Update dashboard stats first

            if (trackingTableBody) {
                trackingTableBody.innerHTML = ''; // Clear existing rows
                if (trackings.length === 0) {
                    trackingTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                    return;
                }
                trackings.forEach(tracking => {
                    const row = document.createElement('tr');
                    const statusClass = getStatusColorClass(tracking.status); // Get class for status color
                    row.innerHTML = `
                        <td>${tracking.trackingId}</td>
                        <td>${tracking.senderName}</td>
                        <td>${tracking.recipientName}</td>
                        <td>${tracking.recipientEmail}</td>
                        <td>${tracking.origin}</td>
                        <td>${tracking.destination}</td>
                        <td><span class="status-indicator ${statusClass}">${tracking.status}</span></td>
                        <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-small waves-effect waves-light blue darken-1 edit-btn" data-tracking-id="${tracking.trackingId}" data-mongo-id="${tracking._id}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-btn" data-tracking-id="${tracking._id}"><i class="material-icons">delete</i></button>
                            <button class="btn btn-small waves-effect waves-light green darken-1 history-btn" data-tracking-id="${tracking._id}"><i class="material-icons">history</i></button>
                        </td>
                    `;
                    trackingTableBody.appendChild(row);
                });

                // Attach event listeners for edit, delete, and history buttons
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingId = this.dataset.trackingId;
                        const mongoId = this.dataset.mongoId;
                        fetchTrackingDetails(trackingId, mongoId);
                    });
                });

                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingId = this.dataset.trackingId; // This is the _id from MongoDB
                        if (confirm('Are you sure you want to delete this tracking?')) {
                            deleteTracking(trackingId);
                        }
                    });
                });

                document.querySelectorAll('.history-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingId = this.dataset.trackingId; // This is the _id from MongoDB
                        showSection('tracking-history-section');
                        fetchTrackingHistory(trackingId);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching trackings:', error);
            if (trackingTableBody) {
                trackingTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load trackings: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Populate Tracking ID dropdowns for Update/Delete/Email/File Attach
    function fetchTrackingIdsForSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking IDs');
                });
            }
            return response.json();
        })
        .then(trackings => {
            // Update/Delete dropdowns
            if (updateTrackingIdSelect) {
                updateTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose tracking ID</option>';
            }
            if (deleteTrackingIdSelect) {
                deleteTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose tracking ID</option>';
            }

            trackings.forEach(tracking => {
                const optionUpdate = document.createElement('option');
                optionUpdate.value = tracking.trackingId; // Use trackingId for selection in UI
                optionUpdate.textContent = tracking.trackingId;
                optionUpdate.setAttribute('data-mongo-id', tracking._id); // Store MongoDB _id

                if (updateTrackingIdSelect) {
                    updateTrackingIdSelect.appendChild(optionUpdate.cloneNode(true));
                }
                if (deleteTrackingIdSelect) {
                    deleteTrackingIdSelect.appendChild(optionUpdate.cloneNode(true));
                }
            });

            // Re-initialize Materialize selects
            if (updateTrackingIdSelect) M.FormSelect.init(updateTrackingIdSelect);
            if (deleteTrackingIdSelect) M.FormSelect.init(deleteTrackingIdSelect);
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for select:', error);
            M.toast({ html: `Failed to load tracking IDs: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Populate Tracking ID dropdowns for Email
    function fetchTrackingIdsForEmailSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking IDs for email');
                });
            }
            return response.json();
        })
        .then(trackings => {
            if (emailTrackingIdSelect) {
                emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose tracking ID</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id for email functionality
                    option.textContent = tracking.trackingId;
                    emailTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(emailTrackingIdSelect);
            }
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for email select:', error);
            M.toast({ html: `Failed to load tracking IDs for email: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Populate Tracking ID dropdowns for Attach File
    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking IDs for file attach');
                });
            }
            return response.json();
        })
        .then(trackings => {
            if (attachFileTrackingIdSelect) {
                attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose tracking ID</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id for file attachment
                    option.textContent = tracking.trackingId;
                    attachFileTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(attachFileTrackingIdSelect);
            }
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for attach file select:', error);
            M.toast({ html: `Failed to load tracking IDs for file attach: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Add New Tracking
    if (addTrackingForm) {
        addTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const newTracking = {
                trackingId: document.getElementById('newTrackingId').value,
                status: document.getElementById('newStatus').value,
                isBlinking: document.getElementById('newIsBlinking').checked,
                statusLineColor: document.getElementById('newStatusLineColor').value,
                blinkingDotColor: document.getElementById('newBlinkingDotColor').value,
                senderName: document.getElementById('newSenderName').value,
                recipientName: document.getElementById('newRecipientName').value,
                recipientEmail: document.getElementById('newRecipientEmail').value,
                packageContents: document.getElementById('newPackageContents').value,
                serviceType: document.getElementById('newServiceType').value,
                recipientAddress: document.getElementById('newRecipientAddress').value,
                specialHandling: document.getElementById('newSpecialHandling').value,
                expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
                expectedDeliveryTime: document.getElementById('newExpectedDeliveryTime').value,
                origin: document.getElementById('newOrigin').value,
                destination: document.getElementById('newDestination').value,
                weight: parseFloat(document.getElementById('newWeight').value)
            };

            fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newTracking)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error creating tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking added successfully!', classes: 'green darken-2' });
                    addTrackingForm.reset();
                    M.updateTextFields(); // Reset Materialize labels
                    M.Datepicker.init(document.getElementById('newExpectedDeliveryDate')); // Re-init datepicker
                    M.Timepicker.init(document.getElementById('newExpectedDeliveryTime')); // Re-init timepicker
                    M.FormSelect.init(document.querySelectorAll('#addTrackingModal select')); // Re-init select

                    fetchAllTrackings(); // Refresh the table and dashboard stats
                    fetchTrackingIdsForSelect(); // Refresh dropdowns
                    fetchTrackingIdsForEmailSelect();
                    fetchTrackingIdsForAttachFileSelect();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not add tracking.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error adding tracking:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    // Fetch Tracking Details for Edit
    function fetchTrackingDetails(trackingId, mongoId) {
        fetch(`/api/admin/trackings/${mongoId}`, { // Use mongoId here
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking details');
                });
            }
            return response.json();
        })
        .then(tracking => {
            // Pre-fill the update form
            updateTrackingMongoId.value = tracking._id; // Store MongoDB _id
            document.getElementById('updateTrackingId').value = tracking.trackingId;
            updateStatusInput.value = tracking.status;
            updateIsBlinkingOriginal.checked = tracking.isBlinking;
            updateStatusLineColor.value = tracking.statusLineColor;
            updateBlinkingDotColor.value = tracking.blinkingDotColor;
            document.getElementById('updateSenderName').value = tracking.senderName;
            document.getElementById('updateRecipientName').value = tracking.recipientName;
            document.getElementById('updateRecipientEmail').value = tracking.recipientEmail;
            document.getElementById('updatePackageContents').value = tracking.packageContents;
            document.getElementById('updateServiceType').value = tracking.serviceType;
            document.getElementById('updateRecipientAddress').value = tracking.recipientAddress;
            document.getElementById('updateSpecialHandling').value = tracking.specialHandling;
            document.getElementById('updateOrigin').value = tracking.origin;
            document.getElementById('updateDestination').value = tracking.destination;
            document.getElementById('updateWeight').value = tracking.weight;

            // Handle date and time pickers
            if (tracking.expectedDeliveryDate) {
                const date = new Date(tracking.expectedDeliveryDate);
                document.getElementById('updateExpectedDeliveryDate').value = date.toISOString().split('T')[0];
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'), {
                    defaultDate: date,
                    setDefaultDate: true
                });
            }
            if (tracking.expectedDeliveryTime) {
                document.getElementById('updateExpectedDeliveryTime').value = tracking.expectedDeliveryTime.substring(0, 5); // Format to HH:MM
                M.Timepicker.init(document.getElementById('updateExpectedDeliveryTime'), {
                    defaultTime: tracking.expectedDeliveryTime.substring(0, 5),
                    setDefaultTime: true
                });
            }


            M.updateTextFields(); // Update Materialize labels for pre-filled fields
            M.FormSelect.init(document.querySelectorAll('#updateTrackingForm select')); // Re-initialize selects
            updateTrackingForm.style.display = 'block'; // Show the update form
        })
        .catch(error => {
            console.error('Error fetching tracking details:', error);
            M.toast({ html: `Failed to load tracking details: ${error.message}`, classes: 'red darken-2' });
            updateTrackingForm.style.display = 'none'; // Hide form on error
        });
    }

    // --- Update Tracking ---
    if (updateTrackingForm) {
        updateTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const mongoId = updateTrackingMongoId.value;
            const updatedData = {
                status: updateStatusInput.value,
                isBlinking: updateIsBlinkingOriginal.checked,
                statusLineColor: document.getElementById('updateStatusLineColor').value,
                blinkingDotColor: document.getElementById('updateBlinkingDotColor').value,
                senderName: document.getElementById('updateSenderName').value,
                recipientName: document.getElementById('updateRecipientName').value,
                recipientEmail: document.getElementById('updateRecipientEmail').value,
                packageContents: document.getElementById('updatePackageContents').value,
                serviceType: document.getElementById('updateServiceType').value,
                recipientAddress: document.getElementById('updateRecipientAddress').value,
                specialHandling: document.getElementById('updateSpecialHandling').value,
                expectedDeliveryDate: document.getElementById('updateExpectedDeliveryDate').value,
                expectedDeliveryTime: document.getElementById('updateExpectedDeliveryTime').value,
                origin: document.getElementById('updateOrigin').value,
                destination: document.getElementById('updateDestination').value,
                weight: parseFloat(document.getElementById('updateWeight').value)
            };

            fetch(`/api/admin/trackings/${mongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking updated successfully!', classes: 'green darken-2' });
                    fetchAllTrackings(); // Refresh all trackings table and dashboard stats
                    fetchTrackingIdsForSelect(); // Refresh dropdown
                    updateTrackingForm.style.display = 'none'; // Hide the form after update
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not update tracking.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error updating tracking:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    // --- Delete Tracking ---
    function deleteTracking(trackingId) {
        // Add console logs for debugging
        console.log('Attempting to delete tracking with ID:', trackingId);
        console.log('Type of tracking ID:', typeof trackingId);

        // Client-side validation: Ensure trackingId is a non-empty string
        if (!trackingId || typeof trackingId !== 'string' || trackingId.trim().length === 0) {
            M.toast({ html: 'Error: Cannot delete. Tracking ID is missing or invalid.', classes: 'red darken-2' });
            console.error('Client-side validation failed: trackingId is', trackingId);
            return; // Stop the function execution
        }

        fetch(`/api/admin/trackings/${trackingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                // Important: Always parse the error response if available
                return response.json().then(errorData => {
                    // This is where your backend's "Invalid tracking ID format" message comes through
                    throw new Error(errorData.message || 'Server error deleting tracking');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                M.toast({ html: 'Tracking deleted successfully!', classes: 'green darken-2' }); // Changed to green for success
                fetchAllTrackings(); // Refresh the table and stats
                fetchTrackingIdsForSelect(); // Refresh dropdowns
                fetchTrackingIdsForEmailSelect();
                fetchTrackingIdsForAttachFileSelect();
            } else {
                M.toast({ html: `Error: ${data.message || 'Could not delete tracking.'}`, classes: 'red darken-2' });
            }
        })
        .catch(error => {
            console.error('Error deleting tracking:', error);
            M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
        });
    }

    function fetchTrackingHistory(trackingId) {
        fetch(`/api/admin/trackings/${trackingId}/history`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Failed to fetch history');
                });
            }
            return response.json();
        })
        .then(data => {
            const historyEvents = data.history;

            const ul = trackingHistoryList.querySelector('ul');
            ul.innerHTML = ''; // Clear previous

            if (!historyEvents || historyEvents.length === 0) {
                ul.innerHTML = '<li class="collection-item">No history events yet.</li>';
                return;
            }

            // ✅ Sort by timestamp
            historyEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            historyEvents.forEach(event => {
                const li = document.createElement('li');
                li.classList.add('collection-item');
                li.innerHTML = `
                    <div class="history-content">
                        <strong>${new Date(event.timestamp).toLocaleString()}</strong> -
                        ${event.location ? `${event.location}: ` : ''}${event.description}
                    </div>
                    <div class="history-actions">
                        <button class="btn-small waves-effect waves-light blue edit-history-btn"
                                data-tracking-mongo-id="${trackingId}" data-history-id="${event._id}"
                                data-date="${new Date(event.timestamp).toISOString().split('T')[0]}"
                                data-time="${new Date(event.timestamp).toTimeString().split(' ')[0].substring(0, 5)}"
                                data-location="${event.location || ''}"
                                data-description="${event.description}">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="btn-small waves-effect waves-light red delete-history-btn"
                                data-tracking-mongo-id="${trackingId}" data-history-id="${event._id}">
                            <i class="material-icons">delete</i>
                        </button>
                    </div>
                `;
                ul.appendChild(li);
            });
            // Attach listeners to newly created history buttons
            attachHistoryButtonListeners();
        })
        .catch(error => {
            console.error('Error fetching tracking history:', error);
            const ul = trackingHistoryList.querySelector('ul');
            ul.innerHTML = `<li class="collection-item red-text">Failed to load history: ${error.message}</li>`;
            M.toast({ html: `Failed to load tracking history: ${error.message}`, classes: 'red darken-2' });
        });
    }

    function attachHistoryButtonListeners() {
        document.querySelectorAll('.edit-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingMongoId = this.dataset.trackingMongoId;
                const historyId = this.dataset.historyId;
                const date = this.dataset.date;
                const time = this.dataset.time;
                const location = this.dataset.location;
                const description = this.dataset.description;

                editHistoryModalTrackingMongoId.value = trackingMongoId;
                editHistoryModalHistoryId.value = historyId;
                editHistoryDate.value = date;
                editHistoryTime.value = time;
                editHistoryLocation.value = location;
                editHistoryDescription.value = description;

                M.updateTextFields(); // Update labels for pre-filled fields
                // Re-init date/time pickers for the modal
                M.Datepicker.init(editHistoryDate);
                M.Timepicker.init(editHistoryTime);

                M.Modal.getInstance(editHistoryModal).open();
            });
        });

        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingMongoId = this.dataset.trackingMongoId;
                const historyId = this.dataset.historyId;
                if (confirm('Are you sure you want to delete this history event?')) {
                    deleteHistoryEvent(trackingMongoId, historyId);
                }
            });
        });
    }

    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const trackingMongoId = updateTrackingMongoId.value; // Get the ID of the currently selected tracking

            const newHistoryEvent = {
                timestamp: new Date(`${document.getElementById('newHistoryDate').value}T${document.getElementById('newHistoryTime').value}`).toISOString(),
                location: document.getElementById('newHistoryLocation').value,
                description: document.getElementById('newHistoryDescription').value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newHistoryEvent)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error adding history event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'History event added successfully!', classes: 'green darken-2' });
                    addHistoryForm.reset();
                    M.updateTextFields();
                    M.Datepicker.init(document.getElementById('newHistoryDate'));
                    M.Timepicker.init(document.getElementById('newHistoryTime'));
                    fetchTrackingHistory(trackingMongoId); // Refresh history list
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not add history event.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error adding history event:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    if (saveHistoryEditBtn) {
        saveHistoryEditBtn.addEventListener('click', function() {
            const trackingMongoId = editHistoryModalTrackingMongoId.value;
            const historyId = editHistoryModalHistoryId.value;

            const updatedHistoryEvent = {
                timestamp: new Date(`${editHistoryDate.value}T${editHistoryTime.value}`).toISOString(),
                location: editHistoryLocation.value,
                description: editHistoryDescription.value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedHistoryEvent)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating history event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'History event updated successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(editHistoryModal).close();
                    fetchTrackingHistory(trackingMongoId); // Refresh history list
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not update history event.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error updating history event:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    function deleteHistoryEvent(trackingMongoId, historyId) {
        fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error deleting history event');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                M.toast({ html: 'History event deleted successfully!', classes: 'red darken-2' });
                fetchTrackingHistory(trackingMongoId); // Refresh history list
            } else {
                M.toast({ html: `Error: ${data.message || 'Could not delete history event.'}`, classes: 'red darken-2' });
            }
        })
        .catch(error => {
            console.error('Error deleting history event:', error);
            M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // --- Send Email Notification ---
    if (sendEmailForm) {
        sendEmailForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 1. Get and trim the values from the input fields
            const recipient = notificationEmail.value.trim();
            const subject = emailSubject.value.trim();
            const message = notificationMessage.value.trim();
            const trackingId = emailTrackingIdSelect.value; // Get tracking ID value

            // 2. Perform client-side validation
            if (!recipient || !subject || !message) {
                M.toast({ html: 'Recipient, Subject, and Message fields are required.', classes: 'red darken-2' });
                return; // Stop the form submission if validation fails
            }

            // Optional: Validate trackingId if it's always required for sending emails
            if (!trackingId) {
                M.toast({ html: 'Please select a Tracking ID.', classes: 'red darken-2' });
                return;
            }

            // 3. If validation passes, proceed with creating FormData
            const formData = new FormData();
            formData.append('recipientEmail', recipient);
            formData.append('subject', subject);
            formData.append('message', message);
            formData.append('trackingId', trackingId); // Use the validated trackingId

            const attachment = emailAttachmentFileUpload.files[0];
            if (attachment) {
                formData.append('attachment', attachment);
            }

            fetch('/api/admin/send-email', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Do NOT set Content-Type header when sending FormData, browser sets it correctly
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error sending email');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Email sent successfully!', classes: 'green darken-2' });
                    sendEmailForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(emailTrackingIdSelect); // Re-init select
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not send email.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error sending email:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }
    // --- Pre-fill email on tracking ID selection ---
    if (emailTrackingIdSelect) {
        emailTrackingIdSelect.addEventListener('change', function() {
            const trackingId = this.value;
            if (trackingId) {
                fetch(`/api/admin/trackings/${trackingId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to fetch tracking details for email pre-fill');
                    return response.json();
                })
                .then(tracking => {
                    if (notificationEmail) notificationEmail.value = tracking.recipientEmail || '';
                    if (emailSubject) emailSubject.value = `Update on your FedEx Shipment: ${tracking.trackingId}`;
                    if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName},\n\nYour shipment with tracking ID ${tracking.trackingId} is currently "${tracking.status}".\n\nLatest update: ${tracking.status} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}.\n\nThank you for choosing FedEx.`;
                    M.updateTextFields(); // Update Materialize labels
                })
                .catch(error => {
                    console.error('Error pre-filling email:', error);
                    M.toast({ html: `Could not pre-fill email: ${error.message}`, classes: 'red darken-2' });
                });
            } else {
                // Clear fields if no tracking ID is selected
                if (notificationEmail) notificationEmail.value = '';
                if (emailSubject) emailSubject.value = '';
                if (notificationMessage) notificationMessage.value = '';
                M.updateTextFields();
            }
        });
    }

    // --- Upload Package File ---
    if (uploadPackageFileForm) {
        uploadPackageFileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingId = attachFileTrackingIdSelect.value;
            const file = packageFileInput.files[0];

            if (!trackingId) {
                M.toast({ html: 'Please select a Tracking ID to link the file to.', classes: 'red darken-2' });
                return;
            }
            if (!file) {
                M.toast({ html: 'Please select a file to upload.', classes: 'red darken-2' });
                return;
            }

            const formData = new FormData();
            formData.append('packageFile', file); // 'packageFile' must match your backend's expected field name

            fetch(`/api/admin/trackings/${trackingId}/upload-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Do NOT set Content-Type header when sending FormData, browser sets it correctly
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error uploading file');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'File uploaded and linked successfully!', classes: 'green darken-2' });
                    uploadPackageFileForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(attachFileTrackingIdSelect); // Re-init select
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not upload file.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    // --- User Management Functions ---

    // Fetch All Users
    function fetchAllUsers() {
        fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching users');
                });
            }
            return response.json();
        })
        .then(users => {
            if (usersTableBody) {
                usersTableBody.innerHTML = ''; // Clear existing rows
                if (users.length === 0) {
                    usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No users found.</td></tr>';
                    return;
                }
                users.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>
                            <button class="btn btn-small waves-effect waves-light blue darken-1 edit-user-btn" data-user-id="${user._id}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-user-modal-trigger" data-user-id="${user._id}" data-username="${user.username}"><i class="material-icons">delete</i></button>
                        </td>
                    `;
                    usersTableBody.appendChild(row);
                });
                // Attach event listeners for edit/delete user buttons
                document.querySelectorAll('.edit-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.userId;
                        fetchUserDetails(userId);
                    });
                });

                document.querySelectorAll('.delete-user-modal-trigger').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.userId;
                        const userNm = this.dataset.username;
                        userIdToDeleteInput.value = userId;
                        if (usernameToDelete) usernameToDelete.textContent = userNm;
                        M.Modal.getInstance(deleteUserModalTrigger).open(); // Open the delete confirmation modal
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Failed to load users: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load users: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Create User
    if (createUserForm) {
        createUserForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const userData = {
                username: document.getElementById('newUsername').value,
                email: document.getElementById('newEmail').value,
                password: document.getElementById('newPassword').value,
                role: document.getElementById('newUserRole').value
            };

            fetch('/api/admin/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error creating user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User created successfully!',
                        classes: 'green darken-2'
                    });
                    M.Modal.getInstance(createUserModal).close();
                    createUserForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#createUserModal select')); // Re-init selects
                    fetchAllUsers();
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not create user.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error creating user:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
        });
    }

    // Fetch User Details for Edit
    function fetchUserDetails(userId) {
        fetch(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({
                        html: 'Session expired or unauthorized. Please log in again.',
                        classes: 'red darken-2'
                    });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching user details');
                });
            }
            return response.json();
        })
        .then(user => {
            document.getElementById('editUserId').value = user._id;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editUserRole').value = user.role;
            M.updateTextFields();
            M.FormSelect.init(document.querySelectorAll('#editUserModal select')); // Re-init select
            M.Modal.getInstance(editUserModal).open();
        })
        .catch(error => {
            console.error('Error fetching user details:', error);
            M.toast({
                html: `Failed to load user details: ${error.message}`,
                classes: 'red darken-2'
            });
        });
    }

    // Update User
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const userId = document.getElementById('editUserId').value;
            const updatedUserData = {
                username: document.getElementById('editUsername').value,
                email: document.getElementById('editEmail').value,
                role: document.getElementById('editUserRole').value
            };

            const newPassword = document.getElementById('editPassword').value;
            if (newPassword) {
                updatedUserData.password = newPassword;
            }

            fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedUserData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User updated successfully!',
                        classes: 'green darken-2'
                    });
                    M.Modal.getInstance(editUserModal).close();
                    editUserForm.reset();
                    M.updateTextFields();
                    fetchAllUsers();
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not update user.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error updating user:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
        });
    }

    // Delete User
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = userIdToDeleteInput.value.trim(); // Trim whitespace from the ID

            // Add client-side validation for userId
            if (!userId || userId.length === 0) {
                M.toast({
                    html: 'Error: User ID is missing or invalid. Cannot delete.',
                    classes: 'red darken-2'
                });
                console.error('Client-side validation failed: User ID is', userId);
                M.Modal.getInstance(deleteUserModalTrigger).close(); // Close modal if validation fails
                return; // Stop the function
            }

            fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        // Backend validation error would come through here
                        throw new Error(errorData.message || 'Server error deleting user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User deleted successfully!',
                        classes: 'green darken-2' // Changed to green for success messages
                    });
                    M.Modal.getInstance(deleteUserModalTrigger).close(); // Correctly close the modal
                    fetchAllUsers(); // Refresh the user list
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not delete user.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting user:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
        });
    }


    // --- Dashboard Quick Stats Update ---
    function updateDashboardStats(trackings) {
        const total = trackings.length;
        const delivered = trackings.filter(t => t.status.toLowerCase().includes('delivered')).length;
        const inTransit = trackings.filter(t => t.status.toLowerCase().includes('in transit')).length;
        const pending = trackings.filter(t => t.status.toLowerCase().includes('pending') || t.status.toLowerCase().includes('on hold')).length;
        const exceptions = trackings.filter(t => t.status.toLowerCase().includes('exception') || t.status.toLowerCase().includes('delay')).length;

        if (totalPackages) totalPackages.textContent = total;
        if (deliveredPackages) deliveredPackages.textContent = delivered;
        if (inTransitPackages) inTransitPackages.textContent = inTransit;
        if (pendingPackages) pendingPackages.textContent = pending;
        if (exceptionsPackages) exceptionsPackages.textContent = exceptions;
    }

    function getStatusColorClass(status) {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('delivered')) {
            return 'delivered';
        } else if (lowerStatus.includes('in transit')) {
            return 'in-transit';
        } else if (lowerStatus.includes('pending') || lowerStatus.includes('on hold')) {
            return 'pending';
        } else if (lowerStatus.includes('exception') || lowerStatus.includes('delay')) {
            return 'exception';
        } else {
            return 'unknown';
        }
    }


    // Initial load: show dashboard and fetch all trackings to populate stats
    showSection('dashboard-section');
    fetchAllTrackings(); // This will also call updateDashboardStats
    fetchTrackingIdsForSelect(); // Populate initial dropdowns
    fetchTrackingIdsForEmailSelect();
    fetchTrackingIdsForAttachFileSelect();


    // --- Sidebar Toggle Logic ---
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active'); // Toggle the 'active' class to show/hide the sidebar
        });
    } else {
        console.error("Sidebar or menu toggle button not found in the DOM.");
    }

    // Initialize Modals
    M.Modal.init(document.querySelectorAll('.modal'));
});
