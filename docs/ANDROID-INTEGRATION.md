# Android 客户端集成指南

版本：1.0.0  
更新日期：2026-11-25

---

## 目录

1. [概述](#概述)
2. [环境准备](#环境准备)
3. [依赖配置](#依赖配置)
4. [认证实现](#认证实现)
5. [会议集成](#会议集成)
6. [完整示例](#完整示例)
7. [最佳实践](#最佳实践)

---

## 概述

本指南介绍如何在 Android 应用中集成 jitsi-mgr 用户认证系统和 Jitsi Meet SDK。

### 技术栈

- **语言**: Kotlin
- **架构**: MVVM + Repository Pattern
- **网络**: Retrofit + OkHttp
- **存储**: DataStore (SharedPreferences 加密版)
- **依赖注入**: Hilt
- **协程**: Kotlin Coroutines

### 集成流程

```
Android App 启动
       ↓
检查本地 Token (DataStore)
       ↓
   Token 有效？
    /        \
  是          否
   ↓          ↓
主界面      登录界面
   ↓          ↓
加入会议 ← 认证成功
   ↓
传递 JWT 给 Jitsi SDK
   ↓
连接 Prosody
   ↓
会议成功
```

---

## 环境准备

### 1. 最低要求

```gradle
// app/build.gradle.kts
android {
    compileSdk = 34
    
    defaultConfig {
        applicationId = "com.example.cloudmeet"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }
}
```

### 2. 权限配置

```xml
<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Jitsi Meet 所需权限 -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    
    <application
        android:name=".CloudMeetApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">
        
        <!-- Activities... -->
        
    </application>
</manifest>
```

---

## 依赖配置

### 1. 项目依赖

```gradle
// app/build.gradle.kts
dependencies {
    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.20")
    
    // AndroidX
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    
    // Material Design
    implementation("com.google.android.material:material:1.11.0")
    
    // Hilt (依赖注入)
    implementation("com.google.dagger:hilt-android:2.50")
    kapt("com.google.dagger:hilt-compiler:2.50")
    
    // 网络
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    
    // DataStore (加密存储)
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // Jitsi Meet SDK
    implementation("org.jitsi.react:jitsi-meet-sdk:+") {
        isTransitive = true
    }
    
    // 协程
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

### 2. 网络安全配置

```xml
<!-- res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 生产环境：只允许 HTTPS -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- 开发环境：允许 HTTP（仅用于测试）-->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>  <!-- Android 模拟器 -->
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

---

## 认证实现

### 1. 数据模型

```kotlin
// data/model/User.kt
data class User(
    val id: Int,
    val username: String,
    val displayName: String,
    val email: String?,
    val role: String
)

// data/model/LoginRequest.kt
data class LoginRequest(
    val username: String,
    val password: String,
    val deviceType: String = "android"
)

// data/model/LoginResponse.kt
data class LoginResponse(
    val token: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: User
)

// data/model/ApiResponse.kt
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: Error?,
    val timestamp: String
) {
    data class Error(
        val code: String,
        val message: String
    )
}
```

### 2. API 接口

```kotlin
// data/api/AuthApi.kt
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<LoginResponse>
    
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): ApiResponse<RefreshTokenResponse>
    
    @GET("auth/jwks")
    suspend fun getJwks(): JwksResponse
    
    @GET("users/me")
    suspend fun getCurrentUser(@Header("Authorization") token: String): ApiResponse<User>
    
    @POST("users/me/change-password")
    suspend fun changePassword(
        @Header("Authorization") token: String,
        @Body request: ChangePasswordRequest
    ): ApiResponse<Unit>
}

data class RefreshTokenRequest(val refreshToken: String)
data class RefreshTokenResponse(val token: String, val expiresIn: Int)
data class ChangePasswordRequest(val oldPassword: String, val newPassword: String)
```

### 3. Retrofit 配置

```kotlin
// di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://cloudmeet.example.com/api/mgr/v1/"
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }
}
```

### 4. 安全存储 (DataStore)

```kotlin
// data/local/TokenManager.kt
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.createDataStore(
        name = "auth_prefs",
        serializer = EncryptedSerializer()
    )
    
    companion object {
        private val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val EXPIRES_AT_KEY = longPreferencesKey("expires_at")
        private val USER_KEY = stringPreferencesKey("user")
    }
    
    suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        expiresIn: Int,
        user: User
    ) {
        dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY] = accessToken
            prefs[REFRESH_TOKEN_KEY] = refreshToken
            prefs[EXPIRES_AT_KEY] = System.currentTimeMillis() + (expiresIn * 1000L)
            prefs[USER_KEY] = Gson().toJson(user)
        }
    }
    
    fun getAccessToken(): Flow<String?> {
        return dataStore.data.map { prefs ->
            prefs[ACCESS_TOKEN_KEY]
        }
    }
    
    fun getRefreshToken(): Flow<String?> {
        return dataStore.data.map { prefs ->
            prefs[REFRESH_TOKEN_KEY]
        }
    }
    
    fun getExpiresAt(): Flow<Long> {
        return dataStore.data.map { prefs ->
            prefs[EXPIRES_AT_KEY] ?: 0L
        }
    }
    
    fun getUser(): Flow<User?> {
        return dataStore.data.map { prefs ->
            prefs[USER_KEY]?.let { json ->
                Gson().fromJson(json, User::class.java)
            }
        }
    }
    
    fun isAuthenticated(): Flow<Boolean> {
        return dataStore.data.map { prefs ->
            val token = prefs[ACCESS_TOKEN_KEY]
            val expiresAt = prefs[EXPIRES_AT_KEY] ?: 0L
            token != null && System.currentTimeMillis() < expiresAt
        }
    }
    
    suspend fun clear() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
```

### 5. Repository

```kotlin
// data/repository/AuthRepository.kt
@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) {
    
    suspend fun login(username: String, password: String): Result<User> {
        return try {
            val response = authApi.login(
                LoginRequest(username, password, "android")
            )
            
            if (response.success && response.data != null) {
                val data = response.data
                tokenManager.saveTokens(
                    accessToken = data.token,
                    refreshToken = data.refreshToken,
                    expiresIn = data.expiresIn,
                    user = data.user
                )
                Result.success(data.user)
            } else {
                Result.failure(Exception(response.error?.message ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun refreshToken(): Result<String> {
        return try {
            val refreshToken = tokenManager.getRefreshToken().first()
                ?: return Result.failure(Exception("No refresh token"))
            
            val response = authApi.refreshToken(
                RefreshTokenRequest(refreshToken)
            )
            
            if (response.success && response.data != null) {
                val data = response.data
                // 更新 access token
                tokenManager.saveTokens(
                    accessToken = data.token,
                    refreshToken = refreshToken,
                    expiresIn = data.expiresIn,
                    user = tokenManager.getUser().first()!!
                )
                Result.success(data.token)
            } else {
                Result.failure(Exception(response.error?.message ?: "Refresh failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getToken(): Result<String> {
        val token = tokenManager.getAccessToken().first()
            ?: return Result.failure(Exception("No token"))
        
        val expiresAt = tokenManager.getExpiresAt().first()
        
        // 提前 5 分钟刷新
        val needsRefresh = System.currentTimeMillis() + (5 * 60 * 1000) >= expiresAt
        
        return if (needsRefresh) {
            refreshToken()
        } else {
            Result.success(token)
        }
    }
    
    suspend fun logout() {
        tokenManager.clear()
    }
    
    fun isAuthenticated(): Flow<Boolean> {
        return tokenManager.isAuthenticated()
    }
    
    fun getCurrentUser(): Flow<User?> {
        return tokenManager.getUser()
    }
}
```

### 6. ViewModel

```kotlin
// ui/login/LoginViewModel.kt
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()
    
    fun login(username: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            
            val result = authRepository.login(username, password)
            
            _loginState.value = if (result.isSuccess) {
                LoginState.Success(result.getOrNull()!!)
            } else {
                LoginState.Error(result.exceptionOrNull()?.message ?: "Login failed")
            }
        }
    }
    
    sealed class LoginState {
        object Idle : LoginState()
        object Loading : LoginState()
        data class Success(val user: User) : LoginState()
        data class Error(val message: String) : LoginState()
    }
}
```

---

## 会议集成

### 1. Jitsi Meet 配置

```kotlin
// ui/meeting/JitsiMeetHelper.kt
object JitsiMeetHelper {
    
    fun createJitsiMeetOptions(
        roomName: String,
        token: String,
        user: User
    ): JitsiMeetConferenceOptions {
        val serverURL = URL("https://meet.cloudmeet.example.com")
        
        return JitsiMeetConferenceOptions.Builder()
            .setServerURL(serverURL)
            .setRoom(roomName)
            .setToken(token)  // JWT Token
            .setFeatureFlag("welcomepage.enabled", false)
            .setFeatureFlag("invite.enabled", false)
            .setFeatureFlag("recording.enabled", false)
            .setAudioMuted(false)
            .setVideoMuted(false)
            .setAudioOnly(false)
            .setUserInfo(
                UserInfo(
                    user.displayName,
                    user.email ?: "",
                    null
                )
            )
            .build()
    }
}
```

### 2. 会议 Activity

```kotlin
// ui/meeting/MeetingActivity.kt
@AndroidEntryPoint
class MeetingActivity : AppCompatActivity() {
    
    @Inject
    lateinit var authRepository: AuthRepository
    
    private lateinit var jitsiView: JitsiMeetView
    
    companion object {
        private const val EXTRA_ROOM_NAME = "room_name"
        
        fun start(context: Context, roomName: String) {
            val intent = Intent(context, MeetingActivity::class.java).apply {
                putExtra(EXTRA_ROOM_NAME, roomName)
            }
            context.startActivity(intent)
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_meeting)
        
        // 请求权限
        if (!hasPermissions()) {
            requestPermissions()
            return
        }
        
        setupJitsiMeet()
    }
    
    private fun setupJitsiMeet() {
        val roomName = intent.getStringExtra(EXTRA_ROOM_NAME) ?: return
        
        jitsiView = JitsiMeetView(this)
        val container = findViewById<FrameLayout>(R.id.jitsiContainer)
        container.addView(jitsiView)
        
        // 获取 Token 并加入会议
        lifecycleScope.launch {
            try {
                val tokenResult = authRepository.getToken()
                
                if (tokenResult.isFailure) {
                    showError("获取认证信息失败")
                    return@launch
                }
                
                val token = tokenResult.getOrNull()!!
                val user = authRepository.getCurrentUser().first()!!
                
                val options = JitsiMeetHelper.createJitsiMeetOptions(
                    roomName = roomName,
                    token = token,
                    user = user
                )
                
                jitsiView.join(options)
                
                // 监听事件
                jitsiView.listener = object : JitsiMeetViewListener {
                    override fun onConferenceJoined(data: MutableMap<String, Any>?) {
                        Log.d("Meeting", "Conference joined")
                    }
                    
                    override fun onConferenceTerminated(data: MutableMap<String, Any>?) {
                        Log.d("Meeting", "Conference terminated")
                        finish()
                    }
                    
                    override fun onConferenceWillJoin(data: MutableMap<String, Any>?) {
                        Log.d("Meeting", "Conference will join")
                    }
                }
                
            } catch (e: Exception) {
                Log.e("Meeting", "Error joining meeting", e)
                showError("加入会议失败: ${e.message}")
            }
        }
    }
    
    private fun hasPermissions(): Boolean {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        
        return permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestPermissions() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO
            ),
            100
        )
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == 100) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                setupJitsiMeet()
            } else {
                showError("需要摄像头和麦克风权限")
                finish()
            }
        }
    }
    
    override fun onBackPressed() {
        JitsiMeetView.onBackPressed()
    }
    
    override fun onDestroy() {
        jitsiView.dispose()
        jitsiView.listener = null
        super.onDestroy()
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}
```

---

## 完整示例

### 1. 登录界面

```xml
<!-- res/layout/activity_login.xml -->
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="24dp"
    android:background="@color/background">
    
    <TextView
        android:id="@+id/tvTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="CloudMeet"
        android:textSize="32sp"
        android:textStyle="bold"
        android:textColor="@color/primary"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="80dp" />
    
    <com.google.android.material.textfield.TextInputLayout
        android:id="@+id/tilUsername"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tvTitle"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="48dp">
        
        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/etUsername"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="用户名"
            android:inputType="text"
            android:maxLines="1" />
    </com.google.android.material.textfield.TextInputLayout>
    
    <com.google.android.material.textfield.TextInputLayout
        android:id="@+id/tilPassword"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tilUsername"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:passwordToggleEnabled="true"
        android:layout_marginTop="16dp">
        
        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/etPassword"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="密码"
            android:inputType="textPassword"
            android:maxLines="1" />
    </com.google.android.material.textfield.TextInputLayout>
    
    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnLogin"
        android:layout_width="0dp"
        android:layout_height="56dp"
        android:text="登录"
        android:textSize="16sp"
        app:layout_constraintTop_toBottomOf="@id/tilPassword"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="32dp" />
    
    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:visibility="gone"
        app:layout_constraintTop_toBottomOf="@id/btnLogin"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="16dp" />
    
</androidx.constraintlayout.widget.ConstraintLayout>
```

```kotlin
// ui/login/LoginActivity.kt
@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {
    
    private val viewModel: LoginViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        
        setupViews()
        observeLoginState()
    }
    
    private fun setupViews() {
        val btnLogin = findViewById<MaterialButton>(R.id.btnLogin)
        val etUsername = findViewById<TextInputEditText>(R.id.etUsername)
        val etPassword = findViewById<TextInputEditText>(R.id.etPassword)
        
        btnLogin.setOnClickListener {
            val username = etUsername.text?.toString()?.trim()
            val password = etPassword.text?.toString()
            
            if (username.isNullOrEmpty() || password.isNullOrEmpty()) {
                Toast.makeText(this, "请输入用户名和密码", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            viewModel.login(username, password)
        }
    }
    
    private fun observeLoginState() {
        lifecycleScope.launch {
            viewModel.loginState.collect { state ->
                when (state) {
                    is LoginViewModel.LoginState.Loading -> {
                        showLoading()
                    }
                    is LoginViewModel.LoginState.Success -> {
                        hideLoading()
                        navigateToMain()
                    }
                    is LoginViewModel.LoginState.Error -> {
                        hideLoading()
                        showError(state.message)
                    }
                    else -> {
                        hideLoading()
                    }
                }
            }
        }
    }
    
    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<MaterialButton>(R.id.btnLogin).isEnabled = false
    }
    
    private fun hideLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<MaterialButton>(R.id.btnLogin).isEnabled = true
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
```

---

## 最佳实践

### 1. 安全存储

```kotlin
// ✅ 推荐：使用 DataStore + 加密
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val dataStore = context.createDataStore(
        name = "auth_prefs",
        serializer = EncryptedSerializer(masterKey)
    )
}

// ❌ 不推荐：明文 SharedPreferences
val prefs = getSharedPreferences("auth", MODE_PRIVATE)
prefs.edit().putString("token", token).apply()
```

### 2. 错误处理

```kotlin
// ✅ 推荐：统一错误处理
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception) : Result<Nothing>()
}

// ❌ 不推荐：忽略错误
try {
    val response = api.login(request)
    // 没有检查 response.success
} catch (e: Exception) {
    // 吞掉异常
}
```

### 3. 生命周期管理

```kotlin
// ✅ 推荐：正确清理
override fun onDestroy() {
    jitsiView.dispose()
    jitsiView.listener = null
    super.onDestroy()
}

// ❌ 不推荐：内存泄漏
override fun onDestroy() {
    super.onDestroy()
    // 忘记清理 Jitsi View
}
```

### 4. 权限请求

```kotlin
// ✅ 推荐：使用 ActivityResultContracts
private val requestPermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions()
) { permissions ->
    if (permissions.all { it.value }) {
        setupJitsiMeet()
    } else {
        showError("需要摄像头和麦克风权限")
    }
}

// ❌ 不推荐：使用已弃用的 onRequestPermissionsResult
override fun onRequestPermissionsResult(...) {
    // Deprecated
}
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11-25  
**下一步**: [生产部署指南](../DEPLOYMENT-CHECKLIST.md)
