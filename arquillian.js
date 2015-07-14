/**
 * 
 */

arquillian = function() {

	var managerBuilder = Java.type('org.jboss.arquillian.core.spi.ManagerBuilder');

	var invoke = function(f) { // Need to set TCCL to something else then Orig TCCL due to odd ClassLoader issue with Nashorn
		var classLoader = managerBuilder.class.getClassLoader();
		var curr = java.lang.Thread.currentThread().getContextClassLoader();
		
		java.lang.Thread.currentThread().setContextClassLoader(classLoader);
		return f();
		java.lang.Thread.currentThread().setContextClassLoader(curr);
	}
	
	manager = invoke(function() {
		return managerBuilder.from()
		.extensions(Java.type("org.jboss.arquillian.core.impl.loadable.LoadableExtensionLoader").class)
		.create();
	})
	
	return {
		start: function() {
			manager.start();
		},
		shutdown: function() {
			manager.shutdown();
		},
		container: function(name, configuration) {
			var serviceLoader = manager.resolve(Java.type("org.jboss.arquillian.core.spi.ServiceLoader").class);
			var arqDescriptor = manager.resolve(Java.type("org.jboss.arquillian.config.descriptor.api.ArquillianDescriptor").class);
			var containerDef = arqDescriptor.container(name);
			containerDef.setMode("custom")
			for(var prop in configuration){
				containerDef.property(prop, configuration[prop]);
			}
			var registry = manager.resolve(Java.type("org.jboss.arquillian.container.spi.ContainerRegistry").class);
			var containerRef = registry.create(containerDef, serviceLoader);
			return container(manager, name, containerRef);
		}
	}
}

container = function(manager, containerName, containerRef) {
	var deployments = {};
	var resolveURL = function(metadata) {
		var context = metadata.getContext(Java.type("org.jboss.arquillian.container.spi.client.protocol.metadata.HTTPContext").class);
		var servlet = context.getServlets().get(0);
		
		return servlet.getBaseURI().toString();
	}
	var deploy = function(name, f) {
		var archive = f(org.jboss.shrinkwrap.api.ShrinkWrap.create(Java.type("org.jboss.shrinkwrap.api.spec.WebArchive").class, name));
		var description = new org.jboss.arquillian.container.spi.client.deployment.DeploymentDescription(name, archive);
		var deployment = new org.jboss.arquillian.container.spi.client.deployment.Deployment(description);
		deployments[name] = deployment;
		var metadata;
		manager.fire(
				new org.jboss.arquillian.container.spi.event.DeployDeployment(containerRef, deployment),
				function() {
					metadata = manager.resolve(Java.type("org.jboss.arquillian.container.spi.client.protocol.metadata.ProtocolMetaData").class);
				});
		
		return resolveURL(metadata);
	}
	var undeploy = function(name) {
		manager.fire(new org.jboss.arquillian.container.spi.event.UnDeployDeployment(containerRef, deployments[name]));
	}
	return {
		start: function() {
			manager.fire(new org.jboss.arquillian.container.spi.event.SetupContainer(containerRef));
			manager.fire(new org.jboss.arquillian.container.spi.event.StartContainer(containerRef));
		},
		stop: function() {
			manager.fire(new org.jboss.arquillian.container.spi.event.StopContainer(containerRef));
		},
		deploy: deploy,
		undeploy: undeploy,
		run: function(deployment, f) {
			var id = java.util.UUID.randomUUID().toString() + ".war";
			f(deploy(id, deployment));
			undeploy(id);
		},
	}
}

this.Arquillian = arquillian();


