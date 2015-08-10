/**
 * 
 */

shrinkwrap = function() {
	
	var resolverCl = new java.net.URLClassLoader(
			[new java.io.File("shrinkwrap-resolver-bootstrap-maven-2.2.0-beta-3-SNAPSHOT.jar").toURL()]);
	
	var resolver = java.lang.Class.forName("org.jboss.shrinkwrap.resolver.bootstrap.maven.Resolver", true, resolverCl).static;
	
	return {
		resolve: function(options) {
			var classloader = resolver.resolveAsClassLoader(
					java.lang.Thread.currentThread().getContextClassLoader(),
					options.deps);
			if(options.classes != null) {
				for(var i = 0; i < options.classes.length; i++) {
					var className = options.classes[i];
					var clazz = java.lang.Class.forName(className, true, classloader).static;
					options.target[clazz.class.getSimpleName()] = clazz;
				}
			}
			return classloader;
		},
	}
}

this.ShrinkWrap = shrinkwrap();
this.loadModule = this.ShrinkWrap.resolve