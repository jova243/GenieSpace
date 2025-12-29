// ===== VARIABLES GLOBALES =====
let users = JSON.parse(localStorage.getItem('geniespace_users')) || { 
    "AdminGenie": {
        password: btoa("admin123" + "geniespace_2024"),
        profilePic: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%232962FF'/%3E%3Cpath d='M30,40 L50,60 L70,40' stroke='white' stroke-width='8' fill='none'/%3E%3Ccircle cx='50' cy='50' r='15' fill='%23FF6D00'/%3E%3C/svg%3E",
        studentNumber: "0000000",
        email: "admin@geniespace.tech",
        filiere: "Admin",
        joined: new Date().toISOString()
    }
};

let posts = JSON.parse(localStorage.getItem('geniespace_posts')) || [];
let messages = JSON.parse(localStorage.getItem('geniespace_messages')) || {};
let notif = JSON.parse(localStorage.getItem('geniespace_notif')) || {};
let coursesData = {};

let currentUser = null;
let currentChatUser = null;
let currentPage = 1;
const postsPerPage = 5;

// Variables pour les appels
let peerConnection;
let localStream;
let remoteStream;
let callInProgress = false;
let currentCallType = null;
let caller = null;
let callee = null;

const onlineUsers = ['AdminGenie', 'CodeMaster', 'DevGenius', 'AlgoQueen'];
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// ===== FONCTIONS UTILITAIRES =====
function simpleHash(password) {
    return btoa(password + "geniespace_orbit_2024");
}

function saveUsers() { 
    localStorage.setItem('geniespace_users', JSON.stringify(users)); 
}

function savePosts() { 
    localStorage.setItem('geniespace_posts', JSON.stringify(posts)); 
}

function saveMessages() { 
    localStorage.setItem('geniespace_messages', JSON.stringify(messages)); 
}

function saveNotif() { 
    localStorage.setItem('geniespace_notif', JSON.stringify(notif)); 
}

function saveCoursesData() {
    localStorage.setItem('geniespace_courses', JSON.stringify(coursesData));
}

// ===== GESTION DES ONGLETS =====
function showTab(tab) {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('feed').classList.add('hidden');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.remove('active');
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('loginTab').classList.add('active');
    } else {
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('registerTab').classList.add('active');
    }
}

function togglePassword(passId, checkboxId) {
    const passInput = document.getElementById(passId);
    const checkbox = document.getElementById(checkboxId);
    passInput.type = checkbox.checked ? 'text' : 'password';
}

// ===== INSCRIPTION =====
function register() {
    const name = document.getElementById('regUsername').value.trim();
    const pass = document.getElementById('regPassword').value;
    const studentNum = document.getElementById('studentNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const filiere = document.getElementById('filiere').value;
    const picInput = document.getElementById('regProfilePic');

    if (!name || !pass || !studentNum || !email || !filiere) {
        return alert('🚀 Tous les champs sont requis pour rejoindre GenieSpace !');
    }
    
    if (filiere !== 'L2 Genie Informatique') {
        return alert('⚠️ GenieSpace est réservé aux étudiants L2 Génie Informatique !');
    }
    
    if (!picInput.files[0]) {
        return alert('📸 Une photo de profil est requise !');
    }
    
    if (users[name]) {
        return alert('👤 Ce nom d\'utilisateur est déjà dans l\'espace !');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return alert('📧 Email invalide ! Utilisez un email universitaire.');
    }
    
    const studentRegex = /^\d{7}$/;
    if (!studentRegex.test(studentNum)) {
        return alert('🎓 Numéro étudiant invalide ! 7 chiffres requis.');
    }

    const reader = new FileReader();
    reader.onload = () => {
        users[name] = {
            password: simpleHash(pass),
            profilePic: reader.result,
            studentNumber: studentNum,
            email: email,
            filiere: filiere,
            joined: new Date().toISOString(),
            bio: "Nouveau membre de GenieSpace 🚀"
        };
        saveUsers();
        alert('🎉 Bienvenue dans GenieSpace ! Votre compte a été créé avec succès.');
        showTab('login');
        
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('studentNumber').value = '';
        document.getElementById('email').value = '';
        document.getElementById('filiere').value = '';
        document.getElementById('regProfilePic').value = '';
    };
    reader.readAsDataURL(picInput.files[0]);
}

// ===== CONNEXION =====
function login() {
    const name = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value;
    
    if (!users[name]) {
        return alert('👤 Utilisateur non trouvé dans GenieSpace !');
    }
    
    if (users[name].password !== simpleHash(pass)) {
        return alert('🔒 Mot de passe incorrect !');
    }
    
    currentUser = name;
    notif[currentUser] = notif[currentUser] || {};
    
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('feed').classList.remove('hidden');
    
    document.getElementById('welcome').innerHTML = `
        <i class="fas fa-user-astronaut"></i> Bienvenue, <span id="usernameDisplay">${currentUser}</span> !
        <span class="geniespace-badge">GenieSpace 🚀</span>
    `;
    document.getElementById('usernameDisplay').textContent = currentUser;
    
    currentPage = 1;
    renderPosts();
    renderUsersList();
    initCourses();
    
    setTimeout(() => {
        alert(`🚀 Bienvenue ${currentUser} ! Prêt pour l'aventure GenieSpace ?`);
    }, 300);
}

// ===== DÉCONNEXION =====
function logout() {
    if (confirm("🌌 Voulez-vous vraiment quitter GenieSpace ?")) {
        currentUser = null;
        currentChatUser = null;
        document.getElementById('feed').classList.add('hidden');
        showTab('login');
        
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('postText').value = '';
        document.getElementById('chatMessage').value = '';
        document.getElementById('searchInput').value = '';
        
        alert("👋 À bientôt dans l'espace !");
    }
}

// ===== GESTION DES POSTS =====
function createPost() {
    const text = document.getElementById('postText').value.trim();
    const imgInput = document.getElementById('postImage');
    const postType = document.getElementById('postType').value;
    
    if (!text && !imgInput.files[0]) {
        return alert('📝 Ajoutez du texte ou une image pour publier !');
    }
    
    const typeIcons = {
        'general': '📝',
        'code': '💻',
        'question': '❓',
        'project': '🚀',
        'resource': '📚'
    };
    
    const post = {
        user: currentUser,
        text: text,
        img: '',
        likes: 0,
        comments: [],
        type: postType,
        typeIcon: typeIcons[postType],
        isAdmin: currentUser === 'AdminGenie',
        profilePic: users[currentUser].profilePic,
        date: new Date().toISOString(),
        likedBy: []
    };
    
    if (imgInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            post.img = reader.result;
            posts.unshift(post);
            savePosts();
            currentPage = 1;
            renderPosts();
            document.getElementById('postText').value = '';
            document.getElementById('postImage').value = '';
            showNotification('🚀 Post publié avec succès !');
        };
        reader.readAsDataURL(imgInput.files[0]);
    } else {
        posts.unshift(post);
        savePosts();
        currentPage = 1;
        renderPosts();
        document.getElementById('postText').value = '';
        showNotification('🚀 Post publié avec succès !');
    }
}

function renderPosts() {
    const postsDiv = document.getElementById('posts');
    postsDiv.innerHTML = '';
    
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const postsToShow = posts.slice(startIndex, endIndex);
    
    if (postsToShow.length === 0) {
        postsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-satellite"></i>
                <h3>Aucune activité récente</h3>
                <p>Soyez le premier à publier dans GenieSpace !</p>
            </div>
        `;
        updatePaginationButtons();
        return;
    }
    
    postsToShow.forEach((p, index) => {
        const globalIndex = startIndex + index;
        const div = document.createElement('div');
        div.className = 'post' + (p.isAdmin ? ' admin-post' : '');
        
        const postDate = new Date(p.date);
        const dateStr = postDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="post-user">
                <img src="${p.profilePic}" class="user-img">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong style="color:#e6f1ff;">${p.user}</strong>
                        <span class="geniespace-badge" style="font-size:11px; padding:2px 8px;">
                            ${p.typeIcon} ${p.type}
                        </span>
                        ${p.isAdmin ? '<span style="color:#FF6D00; font-size:12px;">👑</span>' : ''}
                    </div>
                    <div style="font-size:12px; color:#94a3b8;">
                        <i class="far fa-clock"></i> ${dateStr}
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${formatPostText(p.text)}
                ${p.img ? `<br><img src="${p.img}" style="max-width:100%; border-radius:10px; margin-top:15px; border:2px solid rgba(41,98,255,0.3);">` : ''}
            </div>
        `;
        
        const actions = document.createElement('div');
        actions.className = 'post-actions';
        
        const likeBtn = document.createElement('button');
        const isLiked = p.likedBy.includes(currentUser);
        likeBtn.innerHTML = `<i class="fas fa-heart" style="color:${isLiked ? '#FF6D00' : 'inherit'}"></i> ${p.likes}`;
        likeBtn.onclick = () => {
            if (!p.likedBy.includes(currentUser)) {
                p.likes++;
                p.likedBy.push(currentUser);
            } else {
                p.likes = Math.max(0, p.likes - 1);
                p.likedBy = p.likedBy.filter(u => u !== currentUser);
            }
            savePosts();
            renderPosts();
        };
        
        const commentBtn = document.createElement('button');
        commentBtn.innerHTML = '<i class="fas fa-comment"></i> Commenter';
        commentBtn.onclick = () => {
            const comment = prompt('Votre commentaire :');
            if (comment && comment.trim()) {
                p.comments.push({
                    user: currentUser,
                    text: comment.trim(),
                    date: new Date().toISOString(),
                    profilePic: users[currentUser].profilePic
                });
                savePosts();
                renderPosts();
            }
        };
        
        if (currentUser === p.user || currentUser === 'AdminGenie') {
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
            editBtn.style.background = 'rgba(41, 98, 255, 0.3)';
            editBtn.onclick = () => editPost(globalIndex);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer';
            deleteBtn.style.background = 'rgba(255, 109, 0, 0.3)';
            deleteBtn.onclick = () => deletePost(globalIndex);
            
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
        }
        
        actions.appendChild(likeBtn);
        actions.appendChild(commentBtn);
        div.appendChild(actions);
        
        if (p.comments.length > 0) {
            const comDiv = document.createElement('div');
            comDiv.className = 'post-comments';
            comDiv.innerHTML = '<strong style="color:#2962FF;"><i class="fas fa-comments"></i> Commentaires :</strong><br>';
            
            p.comments.forEach(comment => {
                const commentDate = new Date(comment.date);
                const commentDateStr = commentDate.toLocaleDateString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                comDiv.innerHTML += `
                    <div style="margin:8px 0; padding:10px; background:rgba(15,23,42,0.5); border-radius:10px; border-left:3px solid #FF6D00;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                            <img src="${comment.profilePic || users[comment.user]?.profilePic}" style="width:25px; height:25px; border-radius:50%;">
                            <strong style="color:#e6f1ff;">${comment.user}</strong>
                            <span style="font-size:11px; color:#94a3b8;">(${commentDateStr})</span>
                        </div>
                        ${comment.text}
                    </div>
                `;
            });
            
            div.appendChild(comDiv);
        }
        
        postsDiv.appendChild(div);
    });
    
    updatePaginationButtons();
}

function formatPostText(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,109,0,0.1); padding:2px 5px; border-radius:3px; font-family:monospace;">$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#2962FF;">$1</a>');
}

function deletePost(index) {
    if (confirm("⚠️ Voulez-vous vraiment supprimer ce post ?")) {
        posts.splice(index, 1);
        savePosts();
        renderPosts();
        showNotification('🗑️ Post supprimé !');
    }
}

function editPost(index) {
    const post = posts[index];
    const newText = prompt("Modifier votre post :", post.text);
    if (newText !== null && newText.trim() !== post.text) {
        post.text = newText.trim();
        post.date = new Date().toISOString();
        savePosts();
        renderPosts();
        showNotification('✏️ Post modifié !');
    }
}

// ===== PAGINATION =====
function updatePaginationButtons() {
    const totalPages = Math.ceil(posts.length / postsPerPage) || 1;
    document.getElementById('pageInfo').innerHTML = `
        <i class="fas fa-satellite"></i> Orbite ${currentPage}/${totalPages}
    `;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage * postsPerPage >= posts.length;
}

function nextPage() {
    if (currentPage * postsPerPage < posts.length) {
        currentPage++;
        renderPosts();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPosts();
    }
}

function filterPosts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (!search) {
        renderPosts();
        return;
    }
    
    const postsDiv = document.getElementById('posts');
    postsDiv.innerHTML = '';
    
    const filteredPosts = posts.filter(p => 
        p.user.toLowerCase().includes(search) || 
        p.text.toLowerCase().includes(search) ||
        p.type.toLowerCase().includes(search)
    );
    
    if (filteredPosts.length === 0) {
        postsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Aucun résultat</h3>
                <p>Aucun post ne correspond à "${search}"</p>
            </div>
        `;
        return;
    }
    
    filteredPosts.forEach(p => {
        const div = document.createElement('div');
        div.className = 'post' + (p.isAdmin ? ' admin-post' : '');
        
        const postDate = new Date(p.date);
        const dateStr = postDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="post-user">
                <img src="${p.profilePic}" class="user-img">
                <div>
                    <strong>${p.user}</strong>
                    <div style="font-size:12px; color:#94a3b8;">${dateStr}</div>
                </div>
            </div>
            <div class="post-content">
                ${formatPostText(p.text)}
                ${p.img ? `<br><img src="${p.img}" style="max-width:300px; margin-top:10px;">` : ''}
            </div>
        `;
        
        postsDiv.appendChild(div);
    });
}

// ===== GESTION DES COURS =====
function initCourses() {
    // Charger les données des cours depuis localStorage ou initialiser
    coursesData = JSON.parse(localStorage.getItem('geniespace_courses')) || getDefaultCoursesData();
    saveCoursesData();
}

function getDefaultCoursesData() {
    return {
        "INF201": {
            title: "UE INF201 - Analyse Informatique",
            color: "#2962FF",
            icon: "🔍",
            description: "Introduction à l'analyse des systèmes informatiques et à la modélisation",
            fullDescription: `
                <h4 style="color:#FF6D00;">📘 Objectifs du cours :</h4>
                <p>Ce cours introduit les concepts fondamentaux de l'analyse informatique :</p>
                <ul>
                    <li>Analyse des besoins fonctionnels et techniques</li>
                    <li>Modélisation des systèmes d'information</li>
                    <li>Méthodologies d'analyse (Merise, UML)</li>
                    <li>Rédaction de cahiers des charges</li>
                </ul>
                
                <h4 style="color:#FF6D00;">🎯 Compétences visées :</h4>
                <ul>
                    <li>Comprendre et analyser un problème informatique</li>
                    <li>Produire des spécifications fonctionnelles</li>
                    <li>Modéliser des processus métier</li>
                    <li>Rédiger un cahier des charges complet</li>
                </ul>
            `,
            resources: [
                { type: "pdf", title: "Polycopié du cours", url: "#" },
                { type: "video", title: "Vidéos explicatives", url: "#" },
                { type: "exercise", title: "TDs corrigés", url: "#" }
            ]
        },
        // ... (ajouter tous les autres cours comme dans le code précédent)
        // Pour gagner de l'espace, je vais mettre un exemple réduit
        "BDD": {
            title: "Bases de Données",
            color: "#4CAF50",
            icon: "🗄️",
            description: "Conception et manipulation des bases de données relationnelles",
            fullDescription: "<h4>Bases de données relationnelles et SQL</h4>",
            resources: [
                { type: "sql", title: "Exercices SQL", url: "#" }
            ]
        }
    };
}

function toggleCourses() {
    const coursesList = document.getElementById('coursesList');
    const toggleBtn = document.getElementById('toggleCoursesBtn');
    
    if (coursesList.classList.contains('hidden')) {
        coursesList.classList.remove('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Masquer les cours';
        renderCoursesList();
    } else {
        coursesList.classList.add('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-book-open"></i> Voir tous les cours';
        document.getElementById('courseDetail').classList.add('hidden');
    }
}

function renderCoursesList() {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '';
    
    const ueOrder = [
        { code: "INF201", name: "UE INF201" },
        { code: "BDD", name: "Base de Données" },
        { code: "SE", name: "Système d'Exploitation" },
        { code: "INF202", name: "UE INF202" },
        { code: "JAVA", name: "Langage JAVA" },
        { code: "MAT203", name: "UE MAT203" },
        { code: "INF203", name: "UE INF203" },
        { code: "ADMIN_BDD", name: "Admin BDD" },
        { code: "ARCHI", name: "Architecture" },
        { code: "PYTHON", name: "Python" },
        { code: "RESEAUX", name: "Réseaux" },
        { code: "IA", name: "Intelligence Artificielle" },
        { code: "PROJET_RECHERCHE", name: "Projet Recherche" }
    ];
    
    ueOrder.forEach(ue => {
        const course = coursesData[ue.code];
        if (course) {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.style.cssText = `
                --course-color: ${course.color};
                background: linear-gradient(135deg, ${course.color}20, ${course.color}40);
                border: 2px solid ${course.color};
            `;
            
            courseCard.onclick = () => showCourseDetail(ue.code);
            
            courseCard.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                    <span style="font-size:32px;">${course.icon}</span>
                    <div>
                        <h4 style="color:${course.color}; margin:0 0 5px 0;">${course.title}</h4>
                        <p style="color:#94a3b8; font-size:14px; margin:0;">${ue.name}</p>
                    </div>
                </div>
                <p style="color:#e6f1ff; font-size:14px; line-height:1.5; margin-bottom:15px;">
                    ${course.description}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#94a3b8; font-size:12px;">
                        <i class="fas fa-clock"></i> 30h cours + 20h TD
                    </span>
                    <button style="width:auto; padding:5px 15px; background:${course.color}; border:none; border-radius:20px; color:white; font-size:12px;">
                        <i class="fas fa-eye"></i> Voir
                    </button>
                </div>
            `;
            
            coursesList.appendChild(courseCard);
        }
    });
}

function showCourseDetail(courseId) {
    const course = coursesData[courseId];
    if (!course) return;
    
    document.getElementById('coursesList').classList.add('hidden');
    document.getElementById('toggleCoursesBtn').innerHTML = 
        '<i class="fas fa-arrow-left"></i> Retour à la liste';
    
    document.getElementById('courseTitle').innerHTML = `
        ${course.icon} ${course.title}
    `;
    document.getElementById('courseTitle').style.color = course.color;
    
    document.getElementById('courseContent').innerHTML = course.fullDescription;
    
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = '';
    
    course.resources.forEach(resource => {
        const resourceBtn = document.createElement('button');
        resourceBtn.style.cssText = `
            width: auto;
            padding: 8px 15px;
            background: ${course.color}20;
            border: 1px solid ${course.color};
            border-radius: 10px;
            color: ${course.color};
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        resourceBtn.innerHTML = `
            <i class="fas fa-${getResourceIcon(resource.type)}"></i>
            ${resource.title}
        `;
        resourceBtn.onclick = () => {
            showNotification(`📚 Ouverture de : ${resource.title}`);
        };
        resourcesList.appendChild(resourceBtn);
    });
    
    document.getElementById('courseDetail').classList.remove('hidden');
}

function closeCourseDetail() {
    document.getElementById('courseDetail').classList.add('hidden');
    document.getElementById('coursesList').classList.remove('hidden');
    document.getElementById('toggleCoursesBtn').innerHTML = 
        '<i class="fas fa-book-open"></i> Voir tous les cours';
}

function getResourceIcon(type) {
    const icons = {
        'pdf': 'file-pdf', 'video': 'video', 'exercise': 'dumbbell',
        'sql': 'database', 'diagram': 'project-diagram', 'project': 'project-diagram',
        'command': 'terminal', 'script': 'code', 'config': 'cog',
        'algo': 'algorithm', 'pattern': 'shapes', 'complexity': 'chart-line',
        'code': 'code', 'api': 'book', 'test': 'vial',
        'formula': 'square-root-alt', 'application': 'laptop-code'
    };
    return icons[type] || 'file';
}

// ===== MESSAGERIE =====
function renderUsersList() {
    const usersDiv = document.getElementById('usersList');
    usersDiv.innerHTML = `
        <div class="users-list-header">
            <i class="fas fa-users"></i>
            <div>Connectez-vous aux autres ingénieurs</div>
        </div>
    `;
    
    Object.keys(users).forEach(u => {
        if (u !== currentUser && (users[u].filiere === 'L2 Genie Informatique' || users[u].filiere === 'Admin')) {
            const div = document.createElement('div');
            
            const img = document.createElement('img');
            img.src = users[u].profilePic;
            img.className = 'user-img';
            div.appendChild(img);
            
            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            
            const nameSpan = document.createElement('div');
            nameSpan.style.fontWeight = 'bold';
            nameSpan.style.color = '#e6f1ff';
            nameSpan.textContent = u;
            infoDiv.appendChild(nameSpan);
            
            const statusSpan = document.createElement('div');
            statusSpan.style.fontSize = '12px';
            statusSpan.style.color = '#94a3b8';
            statusSpan.innerHTML = `
                <span>${users[u].filiere === 'Admin' ? '👑 Admin' : '👨‍🎓 L2 Génie Info'}</span>
                <span class="${onlineUsers.includes(u) ? 'online-dot' : 'offline-dot'}"></span>
            `;
            infoDiv.appendChild(statusSpan);
            
            div.appendChild(infoDiv);
            
            const notifDot = document.createElement('div');
            notifDot.className = 'notif';
            notifDot.style.display = (notif[currentUser] && notif[currentUser][u]) ? 'block' : 'none';
            div.appendChild(notifDot);
            
            div.onclick = () => {
                currentChatUser = u;
                if (notif[currentUser]) {
                    notif[currentUser][u] = false;
                    saveNotif();
                }
                document.getElementById('chatHeader').innerHTML = `
                    <i class="fas fa-comments"></i> 
                    <span>Discussion avec ${u}</span>
                    <span class="${onlineUsers.includes(u) ? 'online-dot' : 'offline-dot'}" style="margin-left:10px;"></span>
                `;
                renderChat();
                renderUsersList();
                document.getElementById('chatMessage').focus();
            };
            
            usersDiv.appendChild(div);
        }
    });
}

function renderChat() {
    const chatDiv = document.getElementById('messages');
    chatDiv.innerHTML = '';
    
    if (!currentChatUser) {
        chatDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots"></i>
                <h3>Sélectionnez un contact</h3>
                <p>Choisissez un membre de GenieSpace pour commencer à discuter</p>
            </div>
        `;
        return;
    }
    
    const chatKey1 = currentUser + '_' + currentChatUser;
    const chatKey2 = currentChatUser + '_' + currentUser;
    const chatMsgs = messages[chatKey1] || messages[chatKey2] || [];
    
    if (chatMsgs.length === 0) {
        chatDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-medical"></i>
                <h3>Nouvelle conversation</h3>
                <p>Envoyez votre premier message à ${currentChatUser} !</p>
            </div>
        `;
        return;
    }
    
    chatMsgs.forEach(msg => {
        const div = document.createElement('div');
        div.textContent = msg.message;
        div.className = msg.sender === currentUser ? 'me' : 'other';
        
        const timeSpan = document.createElement('span');
        timeSpan.style.fontSize = '10px';
        timeSpan.style.marginLeft = '8px';
        timeSpan.style.opacity = '0.7';
        timeSpan.textContent = new Date(msg.timestamp || Date.now()).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.appendChild(timeSpan);
        chatDiv.appendChild(div);
    });
    
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function sendMessage() {
    if (!currentChatUser) {
        return showNotification('👥 Sélectionnez un contact d\'abord !');
    }
    
    const text = document.getElementById('chatMessage').value.trim();
    if (!text) return;
    
    const chatKey = currentUser + '_' + currentChatUser;
    if (!messages[chatKey]) messages[chatKey] = [];
    
    messages[chatKey].push({
        sender: currentUser,
        message: text,
        timestamp: Date.now()
    });
    
    notif[currentChatUser] = notif[currentChatUser] || {};
    notif[currentChatUser][currentUser] = true;
    
    saveMessages();
    saveNotif();
    document.getElementById('chatMessage').value = '';
    renderChat();
    renderUsersList();
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ===== APPELS =====
async function startAudioCall() {
    if (!currentChatUser) {
        alert('Sélectionnez un contact avant d\'appeler');
        return;
    }
    
    currentCallType = 'audio';
    caller = currentUser;
    callee = currentChatUser;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = remoteStream;
        };
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                simulateSignaling('ice-candidate', event.candidate);
            }
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        simulateSignaling('offer', offer);
        
        showCallWindow();
        showNotification(`📞 Appel audio en cours avec ${callee}`);
        
    } catch (error) {
        console.error('Erreur démarrage appel:', error);
        alert('Impossible d\'accéder au microphone');
    }
}

async function startVideoCall() {
    if (!currentChatUser) {
        alert('Sélectionnez un contact avant d\'appeler');
        return;
    }
    
    currentCallType = 'video';
    caller = currentUser;
    callee = currentChatUser;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        document.getElementById('localVideo').srcObject = localStream;
        
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = remoteStream;
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        simulateSignaling('offer', offer);
        
        showCallWindow();
        showNotification(`📹 Appel vidéo en cours avec ${callee}`);
        
    } catch (error) {
        console.error('Erreur démarrage vidéo:', error);
        alert('Impossible d\'accéder à la caméra/microphone');
    }
}

async function startScreenShare() {
    if (!currentChatUser) {
        alert('Sélectionnez un contact avant de partager');
        return;
    }
    
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        currentCallType = 'screen';
        caller = currentUser;
        callee = currentChatUser;
        
        document.getElementById('localVideo').srcObject = localStream;
        
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            track.onended = () => {
                endCall();
            };
        });
        
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = remoteStream;
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        simulateSignaling('offer', offer);
        
        showCallWindow();
        showNotification(`🖥️ Partage d'écran avec ${callee}`);
        
    } catch (error) {
        console.error('Erreur partage écran:', error);
        alert('Partage d\'écran annulé');
    }
}

function showCallWindow() {
    callInProgress = true;
    document.getElementById('callWindow').classList.remove('hidden');
    document.getElementById('callWith').textContent = callee;
    
    if (currentCallType === 'audio') {
        document.getElementById('localVideo').style.display = 'none';
        document.getElementById('remoteVideo').style.display = 'none';
        document.getElementById('callInfo').innerHTML = `
            <i class="fas fa-phone" style="color:#4CAF50; font-size:24px;"></i><br>
            Appel audio avec <span style="color:#FF6D00; font-weight:bold;">${callee}</span><br>
            <small style="color:#94a3b8;">Durée: <span id="callTimer">00:00</span></small>
        `;
        startCallTimer();
    } else {
        document.getElementById('localVideo').style.display = 'block';
        document.getElementById('remoteVideo').style.display = 'block';
        startCallTimer();
    }
}

function simulateIncomingCall(from, type) {
    if (callInProgress) {
        simulateSignaling('busy', {});
        return;
    }
    
    caller = from;
    currentCallType = type;
    
    document.getElementById('incomingCall').classList.remove('hidden');
    document.getElementById('callerName').textContent = from;
    
    setTimeout(() => {
        if (!document.getElementById('incomingCall').classList.contains('hidden')) {
            rejectCall();
        }
    }, 30000);
}

async function acceptCall() {
    document.getElementById('incomingCall').classList.add('hidden');
    
    callee = currentUser;
    
    try {
        if (currentCallType === 'audio') {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: true 
            });
            document.getElementById('localVideo').srcObject = localStream;
        }
        
        showCallWindow();
        showNotification(`✅ Appel accepté avec ${caller}`);
        
    } catch (error) {
        console.error('Erreur acceptation appel:', error);
        alert('Impossible de démarrer l\'appel');
    }
}

function rejectCall() {
    document.getElementById('incomingCall').classList.add('hidden');
    simulateSignaling('reject', {});
    showNotification(`❌ Appel refusé`);
}

function endCall() {
    callInProgress = false;
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    document.getElementById('callWindow').classList.add('hidden');
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
    
    caller = null;
    callee = null;
    currentCallType = null;
    stopCallTimer();
    
    simulateSignaling('end-call', {});
    
    showNotification('📞 Appel terminé');
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('muteBtn');
            btn.innerHTML = audioTrack.enabled ? 
                '<i class="fas fa-microphone"></i> Muet' : 
                '<i class="fas fa-microphone-slash" style="color:#FF6D00;"></i> Muet';
        }
    }
}

function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = document.getElementById('videoBtn');
            btn.innerHTML = videoTrack.enabled ? 
                '<i class="fas fa-video"></i> Cam' : 
                '<i class="fas fa-video-slash" style="color:#FF6D00;"></i> Cam';
        }
    }
}

let callTimerInterval;
function startCallTimer() {
    let seconds = 0;
    callTimerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('callTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
    }
}

function simulateSignaling(type, data) {
    console.log(`Signalisation: ${type}`, data);
    
    if (type === 'offer') {
        setTimeout(() => {
            if (currentChatUser === 'AdminGenie') {
                simulateIncomingCall('AdminGenie', currentCallType);
            }
        }, 3000);
    }
}

// ===== NOTIFICATIONS =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(90deg, #2962FF 0%, #FF6D00 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Ajouter des posts exemple au premier lancement
    if (posts.length === 0) {
        posts.push({
            user: 'AdminGenie',
            text: '🚀 Bienvenue sur **GenieSpace** !\n\nCette plateforme est dédiée aux étudiants L2 Génie Informatique. Partagez vos projets, posez des questions, échangez du code et construisez votre réseau !\n\nN\'hésitez pas à publier vos premiers messages !',
            img: '',
            likes: 5,
            comments: [],
            type: 'general',
            typeIcon: '📝',
            isAdmin: true,
            profilePic: users['AdminGenie'].profilePic,
            date: new Date().toISOString(),
            likedBy: []
        });
        
        posts.push({
            user: 'AdminGenie',
            text: '💡 **Astuce du jour** : Utilisez `backticks` pour formater votre code dans les posts !\n\n```javascript\nfunction hello() {\n  console.log("Bonjour GenieSpace !");\n}\n```',
            img: '',
            likes: 3,
            comments: [],
            type: 'code',
            typeIcon: '💻',
            isAdmin: true,
            profilePic: users['AdminGenie'].profilePic,
            date: new Date(Date.now() - 3600000).toISOString(),
            likedBy: []
        });
        
        savePosts();
    }
    
    console.log('🚀 GenieSpace initialisé !');
    
    // Ajouter les styles d'animation
    const style = document.createElement('style');
    style.textContent = `
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
        }
        .empty-state i {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .empty-state h3 {
            color: #FF6D00;
        }
    `;
    document.head.appendChild(style);
});

// ===== FONCTIONS DE DÉMO =====
function quickAdminLogin() {
    document.getElementById('loginUsername').value = 'AdminGenie';
    document.getElementById('loginPassword').value = 'admin123';
    login();
}

function generateMeetingLink() {
    if (!currentChatUser) {
        alert('Sélectionnez un contact');
        return;
    }
    
    const roomName = `geniespace-${currentUser}-${currentChatUser}-${Date.now()}`;
    const meetingLink = `https://meet.jit.si/${roomName}`;
    
    const chatKey = currentUser + '_' + currentChatUser;
    if (!messages[chatKey]) messages[chatKey] = [];
    
    messages[chatKey].push({
        sender: currentUser,
        message: `📞 REJOINS L'APPEL : ${meetingLink}`,
        timestamp: Date.now(),
        isMeetingLink: true
    });
    
    saveMessages();
    renderChat();
    
    window.open(meetingLink, '_blank');
    
    showNotification('🔗 Lien de visio envoyé dans le chat !');
}