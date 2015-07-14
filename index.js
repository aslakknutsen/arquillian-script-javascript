load("arquillian.js")

var deployment = function(archive) {
	return archive.addAsWebResource(new java.io.File("index.html"));
}


Arquillian.start({
	docker: {
		dockerContainersFile: "cube.yaml"
	}
});

var wildfly = Arquillian.container("wildfly", {
	chameleonTarget: "wildfly:9.0.0.Final:remote",
	username: "admin",
	password: "Admin#70365"
});

wildfly.start()

wildfly.run(deployment, function(url) {
	print(url)
})

wildfly.stop()


Arquillian.shutdown();


/*
var url = wildfly.deploy("test.war", deployment)
print(url)
wildfly.undeploy("test.war");
*/
