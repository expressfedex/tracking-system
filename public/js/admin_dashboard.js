document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sections = document.querySelectorAll('.content-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    // Tracking Management elements
    const trackingTableBody = document.getElementById('trackingTableBody');
    const createTrackingForm = document.getElementById('createTrackingForm');
    const editTrackingForm = document.getElementById('editTrackingForm');
    const deleteTrackingBtn = document.getElementById('deleteTrackingBtn');
    const trackingIdToDeleteInput = document.getElementById('trackingIdToDelete');
    const deleteTrackingModalTrigger = document.getElementById('deleteTrackingModal'); // Corrected ID
    const trackingNumberToDisplay = document.getElementById('trackingNumberToDisplay');

    // User Management elements
    const usersTableBody = document.getElementById('usersTableBody');
    const createUserForm = document.getElementById('createUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete');
    const deleteUserModalTrigger = document.getElementById('deleteUserModal'); // Corrected ID
    const createUserModal = document.getElementById('createUserModal');
    const editUserModal = document.getElementById('editUserModal');


    // Dashboard Quick Stats elements
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Email Tracking elements
    const emailTrackingForm = document.getElementById('emailTrackingForm');
    const emailTrackingId = document.getElementById('emailTrackingId');
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailBody');

    // Attach File elements
    const attachFileForm = document.getElementById('attachFileForm');
    const attachFileTrackingId = document.getElementById('attachFileTrackingId');
    const fileInput = document.getElementById('fileInput');

    // Initialize Modals from Materialize (assuming you have MaterializeCSS)
    // You'd typically do this once all your HTML is loaded and accessible
    // M.Modal.init(document.querySelectorAll('.modal'));
    // M.FormSelect.init(document.querySelectorAll('select')); // Initialize Materialize selects


    // --- Helper Functions ---
    function showSection(id) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
    }

    // --- Sidebar Navigation ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            sidebarLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);

            // Fetch data relevant to the section
            if (targetSection === 'tracking-management-section') {
                fetchAllTrackings();
            } else if (targetSection === 'user-management-section') {
                fetchAllUsers();
            }
            // Close sidebar on link click for smaller screens
            if (window.innerWidth <= 992) { // Materialize's typical mobile breakpoint
                sidebar.classList.remove('active');
                mainContent.classList.remove('pushed');
                menuToggle.classList.remove('active');
            }
        });
    });

    // --- API Calls and Form Submissions ---

    // Fetch All Trackings
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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching trackings');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                if (trackingTableBody) {
                    trackingTableBody.innerHTML = '';
                    if (trackings.length === 0) {
                        trackingTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No trackings found.</td></tr>`;
                    } else {
                        trackings.forEach(tracking => {
                            const row = `
                                <tr>
                                    <td>${tracking.trackingNumber}</td>
                                    <td>${tracking.senderName}</td>
                                    <td>${tracking.receiverName}</td>
                                    <td>${new Date(tracking.pickupDate).toLocaleDateString()}</td>
                                    <td>${new Date(tracking.deliveryDate).toLocaleDateString()}</td>
                                    <td><span class="status-badge ${getStatusColorClass(tracking.status)}">${tracking.status}</span></td>
                                    <td>
                                        <button class="btn-small blue darken-2 edit-tracking-btn" data-id="${tracking._id}" data-trackingnumber="${tracking.trackingNumber}">
                                            <i class="material-icons">edit</i>
                                        </button>
                                        <button class="btn-small red darken-2 delete-tracking-modal-trigger" data-id="${tracking._id}" data-trackingnumber="${tracking.trackingNumber}">
                                            <i class="material-icons">delete</i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                            trackingTableBody.innerHTML += row;
                        });
                    }

                    // Attach event listeners for edit and delete buttons
                    document.querySelectorAll('.edit-tracking-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const trackingId = this.dataset.id;
                            fetchTrackingDetails(trackingId);
                        });
                    });

                    document.querySelectorAll('.delete-tracking-modal-trigger').forEach(button => {
                        button.addEventListener('click', function() {
                            const trackingId = this.dataset.id;
                            const trackingNum = this.dataset.trackingnumber;
                            trackingIdToDeleteInput.value = trackingId;
                            if (trackingNumberToDisplay) trackingNumberToDisplay.textContent = trackingNum;
                            M.Modal.getInstance(deleteTrackingModalTrigger).open(); // Open the delete confirmation modal
                        });
                    });
                }
                updateDashboardStats(trackings); // Update dashboard stats with fetched data
            })
            .catch(error => {
                console.error('Error fetching trackings:', error);
                if (trackingTableBody) {
                    trackingTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
                }
                M.toast({
                    html: `Failed to load trackings: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Create Tracking
    if (createTrackingForm) {
        createTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingData = {
                trackingNumber: document.getElementById('newTrackingNumber').value,
                senderName: document.getElementById('newSenderName').value,
                senderAddress: document.getElementById('newSenderAddress').value,
                senderEmail: document.getElementById('newSenderEmail').value,
                senderPhone: document.getElementById('newSenderPhone').value,
                receiverName: document.getElementById('newReceiverName').value,
                receiverAddress: document.getElementById('newReceiverAddress').value,
                receiverEmail: document.getElementById('newReceiverEmail').value,
                receiverPhone: document.getElementById('newReceiverPhone').value,
                itemDescription: document.getElementById('newItemDescription').value,
                pickupDate: document.getElementById('newPickupDate').value,
                pickupTime: document.getElementById('newPickupTime').value,
                deliveryDate: document.getElementById('newDeliveryDate').value,
                deliveryTime: document.getElementById('newDeliveryTime').value,
                status: document.getElementById('newStatus').value,
                currentLocation: document.getElementById('newCurrentLocation').value,
                weight: parseFloat(document.getElementById('newWeight').value),
                dimensions: document.getElementById('newDimensions').value,
                serviceType: document.getElementById('newServiceType').value,
                comments: document.getElementById('newComments').value
            };

            fetch('/api/admin/trackings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(trackingData)
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
                            throw new Error(errorData.message || 'Server error creating tracking');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'Tracking created successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(document.getElementById('createTrackingModal')).close();
                        createTrackingForm.reset();
                        M.updateTextFields(); // Update Materialize text fields
                        M.FormSelect.init(document.querySelectorAll('#createTrackingModal select')); // Re-initialize selects
                        fetchAllTrackings(); // Refresh the list
                        fetchTrackingIdsForSelect(); // Refresh tracking IDs for other forms
                        fetchTrackingIdsForEmailSelect();
                        fetchTrackingIdsForAttachFileSelect();
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not create tracking.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error creating tracking:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // Fetch Tracking Details for Edit
    function fetchTrackingDetails(trackingId) {
        fetch(`/api/admin/trackings/${trackingId}`, {
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
                        throw new Error(errorData.message || 'Server error fetching tracking details');
                    });
                }
                return response.json();
            })
            .then(tracking => {
                document.getElementById('editTrackingId').value = tracking._id;
                document.getElementById('editTrackingNumber').value = tracking.trackingNumber;
                document.getElementById('editSenderName').value = tracking.senderName;
                document.getElementById('editSenderAddress').value = tracking.senderAddress;
                document.getElementById('editSenderEmail').value = tracking.senderEmail;
                document.getElementById('editSenderPhone').value = tracking.senderPhone;
                document.getElementById('editReceiverName').value = tracking.receiverName;
                document.getElementById('editReceiverAddress').value = tracking.receiverAddress;
                document.getElementById('editReceiverEmail').value = tracking.receiverEmail;
                document.getElementById('editReceiverPhone').value = tracking.receiverPhone;
                document.getElementById('editItemDescription').value = tracking.itemDescription;
                document.getElementById('editPickupDate').value = new Date(tracking.pickupDate).toISOString().slice(0, 10);
                document.getElementById('editPickupTime').value = tracking.pickupTime;
                document.getElementById('editDeliveryDate').value = new Date(tracking.deliveryDate).toISOString().slice(0, 10);
                document.getElementById('editDeliveryTime').value = tracking.deliveryTime;
                document.getElementById('editStatus').value = tracking.status;
                document.getElementById('editCurrentLocation').value = tracking.currentLocation;
                document.getElementById('editWeight').value = tracking.weight;
                document.getElementById('editDimensions').value = tracking.dimensions;
                document.getElementById('editServiceType').value = tracking.serviceType;
                document.getElementById('editComments').value = tracking.comments;

                M.updateTextFields(); // Update Materialize text fields
                M.FormSelect.init(document.querySelectorAll('#editTrackingModal select')); // Re-initialize select
                M.Modal.getInstance(document.getElementById('editTrackingModal')).open();
            })
            .catch(error => {
                console.error('Error fetching tracking details:', error);
                M.toast({
                    html: `Failed to load tracking details: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Update Tracking
    if (editTrackingForm) {
        editTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingId = document.getElementById('editTrackingId').value;
            const updatedTrackingData = {
                trackingNumber: document.getElementById('editTrackingNumber').value,
                senderName: document.getElementById('editSenderName').value,
                senderAddress: document.getElementById('editSenderAddress').value,
                senderEmail: document.getElementById('editSenderEmail').value,
                senderPhone: document.getElementById('editSenderPhone').value,
                receiverName: document.getElementById('editReceiverName').value,
                receiverAddress: document.getElementById('editReceiverAddress').value,
                receiverEmail: document.getElementById('editReceiverEmail').value,
                receiverPhone: document.getElementById('editReceiverPhone').value,
                itemDescription: document.getElementById('editItemDescription').value,
                pickupDate: document.getElementById('editPickupDate').value,
                pickupTime: document.getElementById('editPickupTime').value,
                deliveryDate: document.getElementById('editDeliveryDate').value,
                deliveryTime: document.getElementById('editDeliveryTime').value,
                status: document.getElementById('editStatus').value,
                currentLocation: document.getElementById('editCurrentLocation').value,
                weight: parseFloat(document.getElementById('editWeight').value),
                dimensions: document.getElementById('editDimensions').value,
                serviceType: document.getElementById('editServiceType').value,
                comments: document.getElementById('editComments').value
            };

            fetch(`/api/admin/trackings/${trackingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(updatedTrackingData)
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
                            throw new Error(errorData.message || 'Server error updating tracking');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'Tracking updated successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(document.getElementById('editTrackingModal')).close();
                        editTrackingForm.reset();
                        M.updateTextFields();
                        fetchAllTrackings(); // Refresh the list
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not update tracking.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error updating tracking:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // Delete Tracking
    if (deleteTrackingBtn) {
        deleteTrackingBtn.addEventListener('click', function() {
            const trackingId = trackingIdToDeleteInput.value;

            fetch(`/api/admin/trackings/${trackingId}`, {
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
                            throw new Error(errorData.message || 'Server error deleting tracking');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'Tracking deleted successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(deleteTrackingModalTrigger).close(); // Close the modal
                        fetchAllTrackings(); // Refresh the list
                        fetchTrackingIdsForSelect(); // Refresh tracking IDs for other forms
                        fetchTrackingIdsForEmailSelect();
                        fetchTrackingIdsForAttachFileSelect();
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not delete tracking.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error deleting tracking:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // Fetch Tracking IDs for Select (e.g., for email and file attachment)
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
                        console.error('Session expired or unauthorized. Redirecting to login.');
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    throw new Error('Failed to fetch tracking IDs');
                }
                return response.json();
            })
            .then(trackings => {
                // Populate the select for "Update Tracking History" modal
                const selectElement = document.getElementById('trackingIdSelect');
                if (selectElement) {
                    selectElement.innerHTML = '<option value="" disabled selected>Choose your option</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking._id;
                        option.textContent = tracking.trackingNumber;
                        selectElement.appendChild(option);
                    });
                    M.FormSelect.init(selectElement); // Re-initialize Materialize select
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for select:', error);
                M.toast({
                    html: `Failed to load tracking IDs: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Fetch Tracking IDs for Email Select
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
                        console.error('Session expired or unauthorized. Redirecting to login.');
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    throw new Error('Failed to fetch tracking IDs for email');
                }
                return response.json();
            })
            .then(trackings => {
                if (emailTrackingId) {
                    emailTrackingId.innerHTML = '<option value="" disabled selected>Choose Tracking Number</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking._id;
                        option.textContent = tracking.trackingNumber;
                        emailTrackingId.appendChild(option);
                    });
                    M.FormSelect.init(emailTrackingId); // Re-initialize Materialize select
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for email select:', error);
                M.toast({
                    html: `Failed to load tracking IDs for email: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }


    // Send Email
    if (emailTrackingForm) {
        emailTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingId = emailTrackingId.value;
            const subject = emailSubject.value;
            const body = emailBody.value;

            fetch(`/api/admin/trackings/${trackingId}/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        subject,
                        body
                    })
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
                            throw new Error(errorData.message || 'Server error sending email');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'Email sent successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(document.getElementById('emailTrackingModal')).close();
                        emailTrackingForm.reset();
                        M.updateTextFields();
                        M.FormSelect.init(emailTrackingId); // Re-initialize select
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not send email.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error sending email:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // Fetch Tracking IDs for Attach File Select
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
                        console.error('Session expired or unauthorized. Redirecting to login.');
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    throw new Error('Failed to fetch tracking IDs for file attachment');
                }
                return response.json();
            })
            .then(trackings => {
                if (attachFileTrackingId) {
                    attachFileTrackingId.innerHTML = '<option value="" disabled selected>Choose Tracking Number</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking._id;
                        option.textContent = tracking.trackingNumber;
                        attachFileTrackingId.appendChild(option);
                    });
                    M.FormSelect.init(attachFileTrackingId); // Re-initialize Materialize select
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for file attachment select:', error);
                M.toast({
                    html: `Failed to load tracking IDs for file attachment: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Attach File
    if (attachFileForm) {
        attachFileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingId = attachFileTrackingId.value;
            const file = fileInput.files[0];

            if (!file) {
                M.toast({
                    html: 'Please select a file to upload.',
                    classes: 'red darken-2'
                });
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            fetch(`/api/admin/trackings/${trackingId}/attach-file`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
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
                            throw new Error(errorData.message || 'Server error attaching file');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'File attached successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(document.getElementById('attachFileModal')).close();
                        attachFileForm.reset();
                        M.FormSelect.init(attachFileTrackingId); // Re-initialize select
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not attach file.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error attaching file:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // --- User Management ---

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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
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
                    usersTableBody.innerHTML = '';
                    if (users.length === 0) {
                        usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No users found.</td></tr>`;
                    } else {
                        users.forEach(user => {
                            const row = `
                                <tr>
                                    <td>${user.username}</td>
                                    <td>${user.email}</td>
                                    <td>${user.role}</td>
                                    <td>
                                        <button class="btn-small blue darken-2 edit-user-btn" data-id="${user._id}">
                                            <i class="material-icons">edit</i>
                                        </button>
                                        <button class="btn-small red darken-2 delete-user-modal-trigger" data-user-id="${user._id}" data-username="${user.username}">
                                            <i class="material-icons">delete</i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                            usersTableBody.innerHTML += row;
                        });
                    }

                    // Attach event listeners for edit and delete user buttons
                    document.querySelectorAll('.edit-user-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const userId = this.dataset.id;
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
                M.toast({
                    html: `Failed to load users: ${error.message}`,
                    classes: 'red darken-2'
                });
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
                            classes: 'green darken-2'
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
        const delivered = trackings.filter(t => t.status && t.status.toLowerCase().includes('delivered')).length;
        const inTransit = trackings.filter(t => t.status && t.status.toLowerCase().includes('in transit')).length;
        const pending = trackings.filter(t => t.status && (t.status.toLowerCase().includes('pending') || t.status.toLowerCase().includes('on hold'))).length;
        const exceptions = trackings.filter(t => t.status && (t.status.toLowerCase().includes('exception') || t.status.toLowerCase().includes('delay'))).length;

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
    if (menuToggle && sidebar && mainContent) { // Ensure all elements are found
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active'); // Toggle the 'active' class on the sidebar
            mainContent.classList.toggle('pushed'); // Toggle the 'pushed' class on the main content
            menuToggle.classList.toggle('active'); // Optional: Toggle active class on menu toggle itself if it moves
        });
    } else {
        console.error("Sidebar, menu toggle button, or main content not found in the DOM.");
    }


    // Initialize Materialize Modals
    M.Modal.init(document.querySelectorAll('.modal'));
    // Initialize Materialize Selects (for dropdowns that are not dynamically populated later)
    M.FormSelect.init(document.querySelectorAll('select'));
    // Initialize Materialize Datepickers
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    // Initialize Materialize Timepickers
    M.Timepicker.init(document.querySelectorAll('.timepicker'));
});
