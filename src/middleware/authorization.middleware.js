import User from "../models/user.model.js";

/**
 * Role-based Authorization Middleware
 * Checks if user has required role(s)
 */
export const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated first
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            // Get user from database with role
            const user = await User.findById(req.user._id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Check if user has a role
            // Note: You need to add 'role' field to your User model
            if (!user.role) {
                return res.status(403).json({
                    success: false,
                    message: "User role not defined"
                });
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                });
            }

            // Attach user with role to request
            req.user = user;
            next();

        } catch (error) {
            console.error('Authorization error:', error.message);
            res.status(500).json({
                success: false,
                message: "Authorization failed"
            });
        }
    };
};

/**
 * Permission-based Authorization Middleware
 * Checks if user has specific permission(s)
 */
export const authorizePermissions = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const user = await User.findById(req.user._id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Check if user has permissions array
            // Note: You need to add 'permissions' field to your User model
            if (!user.permissions || !Array.isArray(user.permissions)) {
                return res.status(403).json({
                    success: false,
                    message: "User permissions not defined"
                });
            }

            // Check if user has all required permissions
            const hasAllPermissions = requiredPermissions.every(permission => 
                user.permissions.includes(permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
                });
            }

            next();

        } catch (error) {
            console.error('Permission authorization error:', error.message);
            res.status(500).json({
                success: false,
                message: "Permission check failed"
            });
        }
    };
};

/**
 * Resource Ownership Middleware
 * Checks if user owns the resource they're trying to access/modify
 */
export const authorizeOwnership = (resourceModel, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const resourceId = req.params[paramName];
            
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: "Resource ID is required"
                });
            }

            // Find the resource
            const resource = await resourceModel.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: "Resource not found"
                });
            }

            // Check if user owns the resource
            // This assumes your resources have a 'user' field referencing the owner
            if (resource.user && resource.user.toString() !== req.user._id.toString()) {
                
                // If user doesn't own it, check if they have admin role
                const user = await User.findById(req.user._id);
                if (user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: "You don't have permission to access this resource"
                    });
                }
            }

            // Attach resource to request for use in controller
            req.resource = resource;
            next();

        } catch (error) {
            console.error('Ownership authorization error:', error.message);
            res.status(500).json({
                success: false,
                message: "Ownership check failed"
            });
        }
    };
};

/**
 * Self-Action Authorization Middleware
 * Allows users to only perform actions on their own account
 * unless they're admin
 */
export const authorizeSelfOrAdmin = (paramName = 'userId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const targetUserId = req.params[paramName] || req.body.userId;
            
            // If no target user ID is provided, assume it's for current user
            if (!targetUserId) {
                req.targetUserId = req.user._id;
                return next();
            }

            // Check if user is accessing their own account or is admin
            const user = await User.findById(req.user._id);
            
            if (targetUserId.toString() !== req.user._id.toString() && user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "You can only perform this action on your own account"
                });
            }

            req.targetUserId = targetUserId;
            next();

        } catch (error) {
            console.error('Self/Admin authorization error:', error.message);
            res.status(500).json({
                success: false,
                message: "Authorization check failed"
            });
        }
    };
};

/**
 * Conditional Authorization Middleware
 * Executes different authorization logic based on conditions
 */
export const conditionalAuthorize = (conditionFn, trueMiddleware, falseMiddleware) => {
    return async (req, res, next) => {
        try {
            const condition = await conditionFn(req);
            
            if (condition) {
                return trueMiddleware(req, res, next);
            } else {
                return falseMiddleware ? falseMiddleware(req, res, next) : next();
            }
        } catch (error) {
            console.error('Conditional authorization error:', error.message);
            res.status(500).json({
                success: false,
                message: "Conditional authorization failed"
            });
        }
    };
};

/**
 * Authorization Error Handler Middleware
 * Should be added at the end of your middleware chain
 */
export const authorizationErrorHandler = (err, req, res, next) => {
    if (err.name === 'AuthorizationError') {
        return res.status(403).json({
            success: false,
            message: err.message || "Authorization failed"
        });
    }
    next(err);
};

// Helper function to check specific permissions
export const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);
            
            if (!user.permissions || !user.permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Permission '${permission}' required`
                });
            }
            
            next();
        } catch (error) {
            console.error('Permission check error:', error.message);
            res.status(500).json({
                success: false,
                message: "Permission check failed"
            });
        }
    };
};

// Predefined role constants (optional - you can define these in a separate file)
export const ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    USER: 'user',
    GUEST: 'guest'
};

// Predefined permission constants (optional)
export const PERMISSIONS = {
    // User permissions
    VIEW_PROFILE: 'view_profile',
    EDIT_PROFILE: 'edit_profile',
    DELETE_ACCOUNT: 'delete_account',
    
    // Content permissions
    CREATE_POST: 'create_post',
    EDIT_POST: 'edit_post',
    DELETE_POST: 'delete_post',
    VIEW_ALL_POSTS: 'view_all_posts',
    
    // Admin permissions
    MANAGE_USERS: 'manage_users',
    MANAGE_CONTENT: 'manage_content',
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_SETTINGS: 'manage_settings'
};

// Role-Permission mapping (example)
export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        PERMISSIONS.VIEW_PROFILE,
        PERMISSIONS.EDIT_PROFILE,
        PERMISSIONS.DELETE_ACCOUNT,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.EDIT_POST,
        PERMISSIONS.DELETE_POST,
        PERMISSIONS.VIEW_ALL_POSTS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_CONTENT,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.MANAGE_SETTINGS
    ],
    [ROLES.MODERATOR]: [
        PERMISSIONS.VIEW_PROFILE,
        PERMISSIONS.EDIT_PROFILE,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.EDIT_POST,
        PERMISSIONS.DELETE_POST,
        PERMISSIONS.VIEW_ALL_POSTS,
        PERMISSIONS.MANAGE_CONTENT
    ],
    [ROLES.USER]: [
        PERMISSIONS.VIEW_PROFILE,
        PERMISSIONS.EDIT_PROFILE,
        PERMISSIONS.DELETE_ACCOUNT,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.EDIT_POST,
        PERMISSIONS.DELETE_POST
    ],
    [ROLES.GUEST]: [
        PERMISSIONS.VIEW_PROFILE
    ]
};

/**
 * Middleware to check if user's account is active
 * (Can be used as additional layer before authorization)
 */
export const checkAccountActive = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const user = await User.findById(req.user._id);
        
        if (!user.isActivated) {
            return res.status(403).json({
                success: false,
                message: "Account is not activated. Please verify your email first."
            });
        }

        // Check if account is suspended/banned
        if (user.isSuspended) {
            return res.status(403).json({
                success: false,
                message: "Account is suspended. Please contact support."
            });
        }

        next();
    } catch (error) {
        console.error('Account status check error:', error.message);
        res.status(500).json({
            success: false,
            message: "Account status check failed"
        });
    }
};