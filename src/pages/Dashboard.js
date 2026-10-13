import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import api from "../api/api";
import "./Dashboard.css";


pdfjsLib.GlobalWorkerOptions.workerSrc =
    `${process.env.PUBLIC_URL}/pdfjs/pdf.worker.min.mjs`;

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        techStack: "",
    });

    const [stats, setStats] = useState({
        totalCount: 0,
        dailyStats: []
    });

    const [selectedDate, setSelectedDate] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [resumeName, setResumeName] = useState("");

    const loadStats = useCallback(async () => {
    try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            navigate("/");
            return;
        }

        const user = JSON.parse(storedUser);

        const res = await api.post("profile/stats", {
            email: user.email
        });

        setStats({
            totalCount: res.data.totalCount,
            dailyStats: res.data.dailyStats
        });

    } catch (error) {
        console.error(error);
        toast.error("Unable to load statistics");
    }
}, [navigate]);

   useEffect(() => {

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
        return;
    }

    setUser(JSON.parse(storedUser));

    loadStats();

}, [loadStats]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const updatedForm = {...form, submittedUser: user.email}
            await api.post("profile/submit", updatedForm);

            toast.success("Profile submitted successfully");

            setForm({
                fullName: "",
                email: "",
                phone: "",
                techStack: "",
                submittedUser: user.email
            });

            loadStats();

        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Failed to submit profile"
            );
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        toast.success("Logged out successfully");

        navigate("/");
    };

    const selectedDateCount = selectedDate
        ? stats.dailyStats.find(
            item => item.date === selectedDate
        )?.count || 0
        : 0;

    const today = new Date()
        .toISOString()
        .split("T")[0];

    const todayCount =
        stats.dailyStats.find(
            item => item.date === today
        )?.count || 0;

    if (!user) {
        return null;
    }

    const getNameFromFilename = (filename) => {
    return filename
        .replace(/\.(pdf|docx)$/i, "") // Remove extension
        .replace(/^Naukri_/i, "")      // Remove Naukri_ prefix
        .replace(/\[[^\]]*\]/g, "")    // Remove [experience]
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2") 
        .trim();
};


const extractResumeText = async (file) => {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!["pdf", "docx"].includes(extension)) {
        throw new Error("Please upload a PDF or DOCX resume.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Resume size must be 5 MB or less.");
    }

    const buffer = await file.arrayBuffer();

    if (extension === "pdf") {
        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
        }).promise;

        const pages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            pages.push(
                content.items
                    .map((item) => item.str)
                    .join(" ")
            );
        }

        return pages.join("\n");
    }

    const result = await mammoth.extractRawText({
        arrayBuffer: buffer,
    });

    return result.value;
};

const parseResumeDetails = (text) => {
    const cleanText = text.replace(/\u00a0/g, " ");

    // Extract email
    const email =
        cleanText.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        )?.[0] || "";

    // Extract phone number
    const phoneMatches = cleanText.match(
        /(?:\+?\d[\d\s().-]{7,}\d)/g
    ) || [];

    const phone = phoneMatches
        .map((value) => value.trim())
        .find((value) => {
            const digits = value.replace(/\D/g, "");
            return digits.length >= 10 && digits.length <= 15;
        }) || "";

    // Extract a likely name from the beginning of the resume
    const lines = cleanText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const excludedHeadings =
        /^(resume|curriculum vitae|cv|profile|contact|contact information|professional summary|summary|objective)$/i;

    const fullName = lines.find((line) => {
        return (
            line.length <= 60 &&
            !excludedHeadings.test(line) &&
            !/@/.test(line) &&
            !/\d{5,}/.test(line) &&
            /^[a-zA-Z][a-zA-Z .'-]+$/.test(line)
        );
    }) || "";

    // Detect common technical skills
   
const knownSkills = [
    // ================= PROGRAMMING LANGUAGES =================
    "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#",
    "Go", "Golang", "Rust", "Kotlin", "Swift", "Objective-C",
    "PHP", "Ruby", "Perl", "R", "Scala", "Groovy", "Dart",
    "Elixir", "Erlang", "Haskell", "Clojure", "F#", "VB.NET",
    "Visual Basic", "Assembly", "Bash", "Shell Scripting", "PowerShell",
    "MATLAB", "Julia", "Fortran", "COBOL", "Lua", "Solidity",
    "VBA", "PL/SQL", "T-SQL", "Apex", "Scratch",

    // ================= WEB FUNDAMENTALS =================
    "HTML", "HTML5", "CSS", "CSS3", "XML", "JSON",
    "YAML", "Markdown", "Web Components", "Responsive Design",
    "Accessibility", "WCAG", "Progressive Web Apps", "PWA",
    "WebSockets", "HTTP", "HTTPS", "OAuth", "OpenID Connect",

    // ================= FRONTEND FRAMEWORKS =================
    "React", "React.js", "ReactJS", "Next.js", "NextJS",
    "Remix", "Gatsby", "Angular", "AngularJS", "Vue", "Vue.js",
    "Nuxt.js", "Nuxt", "Svelte", "SvelteKit", "Astro",
    "Preact", "Qwik", "SolidJS", "Ember.js", "Backbone.js",
    "jQuery", "Alpine.js", "HTMX", "Lit", "Stencil",
    "Webix", "Mithril.js",

    // ================= UI, CSS & DESIGN SYSTEMS =================
    "Tailwind CSS", "Bootstrap", "Material UI", "MUI",
    "Ant Design", "Chakra UI", " shadcn/ui", "Radix UI",
    "Semantic UI", "Foundation CSS", "Bulma", "Pico CSS",
    "Sass", "SCSS", "Less", "Stylus", "PostCSS",
    "CSS Modules", "Styled Components", "Emotion",
    "Vanilla Extract", "Panda CSS", "PrimeReact",
    "PrimeNG", "Vuetify", "Quasar", "Ionic",
    "Fluent UI", "Blueprint.js", "DaisyUI",
    "Figma", "Adobe XD", "Sketch", "Storybook",

    // ================= STATE MANAGEMENT =================
    "Redux", "Redux Toolkit", "Zustand", "MobX",
    "Recoil", "Jotai", "Valtio", "Pinia", "Vuex",
    "NgRx", "Akita", "XState", "Context API",
    "TanStack Query", "React Query", "SWR",
    "Apollo Client", "Relay", "urql",

    // ================= FRONTEND TOOLING =================
    "Vite", "Webpack", "Rollup", "Parcel", "esbuild",
    "Turbopack", "Babel", "SWC", "ESLint", "Prettier",
    "npm", "Yarn", "pnpm", "Bun", "Lerna",
    "Nx", "Turborepo", "Module Federation",
    "Postman", "Insomnia", "OpenAPI", "Swagger",

    // ================= BACKEND & SERVER FRAMEWORKS =================
    "Node.js", "NodeJS", "Express", "Express.js",
    "NestJS", "Fastify", "Koa", "Hapi",
    "AdonisJS", "Hono", "Elysia",
    "Deno", "Bun Runtime",
    "Django", "Flask", "FastAPI", "Starlette",
    "Sanic", "Tornado", "Falcon", "Pyramid",
    "Spring", "Spring Boot", "Spring MVC",
    "Spring Security", "Spring Cloud", "Hibernate",
    "Jakarta EE", "Java EE", "Quarkus", "Micronaut",
    "Dropwizard", "Vert.x", "Play Framework",
    "ASP.NET", "ASP.NET Core", ".NET", ".NET Core",
    "Blazor", "Entity Framework", "WCF",
    "Laravel", "Symfony", "CodeIgniter", "Yii",
    "CakePHP", "Slim PHP", "WordPress",
    "Ruby on Rails", "Rails", "Sinatra", "Hanami",
    "Gin", "Echo", "Fiber", "Chi",
    "Actix Web", "Axum", "Rocket",
    "Phoenix", "Plug", "Fiber Framework",
    "Gin Gonic", "Beego",
    "Ktor", "Javalin", "Vert.x",
    "GraphQL Yoga", "Apollo Server", "Mercurius",

    // ================= API & ARCHITECTURE =================
    "REST", "REST API", "RESTful API", "GraphQL",
    "gRPC", "SOAP", "Webhooks", "WebSockets",
    "Server-Sent Events", "SSE", "JSON-RPC", "XML-RPC",
    "OpenAPI Specification", "Swagger",
    "Microservices", "Monolithic Architecture",
    "Event-Driven Architecture", "Domain-Driven Design",
    "DDD", "CQRS", "Event Sourcing",
    "Clean Architecture", "Hexagonal Architecture",
    "MVC", "MVVM", "MVP", "SOLID",
    "Design Patterns", "Distributed Systems",
    "API Gateway", "Service Mesh", "BFF",
    "Backend for Frontend", "Serverless Architecture",

    // ================= SQL DATABASES =================
    "SQL", "MySQL", "PostgreSQL", "Postgres",
    "Microsoft SQL Server", "SQL Server",
    "Oracle Database", "Oracle DB", "SQLite",
    "MariaDB", "IBM Db2", "Db2",
    "CockroachDB", "TiDB", "YugabyteDB",
    "Amazon Aurora", "Amazon RDS",
    "Azure SQL", "SAP HANA", "Firebird",
    "H2 Database", "HSQLDB", "Derby",
    "PL/SQL", "T-SQL",

    // ================= NOSQL & DOCUMENT DATABASES =================
    "MongoDB", "CouchDB", "Couchbase",
    "Firebase", "Firestore", "DynamoDB",
    "Amazon DocumentDB", "RavenDB", "ArangoDB",
    "MarkLogic", "Realm", "SurrealDB",

    // ================= KEY-VALUE & IN-MEMORY DATABASES =================
    "Redis", "Memcached", "KeyDB",
    "Amazon ElastiCache", "Valkey",
    "Hazelcast", "Apache Ignite", "Aerospike",
    "etcd", "Consul KV",

    // ================= SEARCH & ANALYTICS ENGINES =================
    "Elasticsearch", "OpenSearch", "Apache Solr",
    "Algolia", "Meilisearch", "Typesense",
    "Splunk", "Sphinx Search",

    // ================= GRAPH DATABASES =================
    "Neo4j", "Amazon Neptune", "JanusGraph",
    "Dgraph", "TigerGraph", "ArangoDB",
    "OrientDB", "Memgraph", "GraphDB",
    "Cypher", "Gremlin",

    // ================= DATA WAREHOUSING & LAKEHOUSE =================
    "Snowflake", "Databricks", "Delta Lake",
    "Apache Iceberg", "Apache Hudi",
    "Google BigQuery", "BigQuery",
    "Amazon Redshift", "Azure Synapse Analytics",
    "Teradata", "Vertica", "ClickHouse",
    "DuckDB", "Trino", "Presto",
    "Greenplum", "StarRocks", "Dremio",

    // ================= CLOUD PLATFORMS =================
    "AWS", "Amazon Web Services",
    "Microsoft Azure", "Azure",
    "Google Cloud Platform", "GCP",
    "Oracle Cloud Infrastructure", "OCI",
    "IBM Cloud", "Alibaba Cloud",
    "DigitalOcean", "Linode", "Akamai Cloud",
    "Vultr", "Hetzner Cloud", "OVHcloud",
    "Cloudflare", "Vercel", "Netlify",
    "Render", "Fly.io", "Railway",
    "Heroku", "Firebase Hosting",
    "Supabase", "Appwrite", "Convex",

    // ================= AWS SERVICES =================
    "EC2", "Amazon EC2", "S3", "Amazon S3",
    "Lambda", "AWS Lambda", "ECS", "EKS",
    "Fargate", "AWS Batch", "Elastic Beanstalk",
    "API Gateway", "CloudFront", "Route 53",
    "CloudWatch", "CloudTrail", "IAM",
    "VPC", "RDS", "DynamoDB",
    "SQS", "SNS", "EventBridge",
    "Step Functions", "Kinesis", "Glue",
    "Athena", "EMR", "Redshift",
    "SageMaker", "Bedrock", "Cognito",
    "Secrets Manager", "Systems Manager",
    "CodeBuild", "CodeDeploy", "CodePipeline",
    "CDK", "AWS CDK", "CloudFormation",

    // ================= AZURE SERVICES =================
    "Azure Functions", "Azure App Service",
    "Azure Kubernetes Service", "AKS",
    "Azure DevOps", "Azure Pipelines",
    "Azure Blob Storage", "Azure Storage",
    "Azure Cosmos DB", "Azure SQL Database",
    "Azure Data Factory", "ADF",
    "Azure Data Lake", "Azure Databricks",
    "Azure Machine Learning",
    "Azure Service Bus", "Event Hubs",
    "Azure Monitor", "Application Insights",
    "Microsoft Entra ID", "Azure Active Directory",
    "Azure Key Vault", "Bicep",

    // ================= GOOGLE CLOUD SERVICES =================
    "Compute Engine", "Google Compute Engine",
    "Cloud Run", "Cloud Functions",
    "Google Kubernetes Engine", "GKE",
    "Cloud Storage", "Pub/Sub",
    "Dataflow", "Dataproc", "Cloud Composer",
    "Vertex AI", "Cloud Build",
    "Cloud SQL", "Spanner", "Bigtable",
    "Firebase", "Firestore",
    "Artifact Registry", "Cloud Logging",

    // ================= CONTAINERS & ORCHESTRATION =================
    "Docker", "Docker Compose", "Podman",
    "containerd", "Buildah", "Kaniko",
    "Kubernetes", "Helm", "Kustomize",
    "OpenShift", "Rancher", "K3s",
    "Istio", "Linkerd", "Consul",
    "Envoy", "Knative", "Argo CD",
    "Flux CD", "Skaffold", "Tilt",

    // ================= CI/CD & DEVOPS =================
    "Jenkins", "GitHub Actions", "GitLab CI/CD",
    "GitLab CI", "Azure DevOps", "CircleCI",
    "Travis CI", "TeamCity", "Bamboo",
    "Buildkite", "Drone CI", "Tekton",
    "Harness", "Spinnaker", "Argo Workflows",
    "AWS CodePipeline", "Bitbucket Pipelines",
    "Octopus Deploy", "Nexus Repository",
    "JFrog Artifactory", "Sonatype Nexus",

    // ================= INFRASTRUCTURE AS CODE =================
    "Terraform", "OpenTofu", "Terragrunt",
    "Pulumi", "Ansible", "Chef", "Puppet",
    "SaltStack", "Vagrant", "Packer",
    "CloudFormation", "AWS CDK",
    "Azure Bicep", "Crossplane",
    "AWS SAM", "Serverless Framework",

    // ================= OPERATING SYSTEMS & NETWORKING =================
    "Linux", "Ubuntu", "Debian", "Red Hat",
    "RHEL", "CentOS", "Fedora", "Alpine Linux",
    "Amazon Linux", "Windows Server",
    "Windows", "macOS", "Unix", "FreeBSD",
    "TCP/IP", "DNS", "DHCP", "HTTP",
    "TLS", "SSL", "SSH", "FTP", "SFTP",
    "Load Balancing", "Reverse Proxy",
    "Nginx", "NGINX", "Apache HTTP Server",
    "HAProxy", "Caddy", "Traefik",
    "BGP", "VPN", "VPC Networking",
    "CDN", "Firewalls", "IP Networking",

    // ================= MESSAGE QUEUES & STREAMING =================
    "Apache Kafka", "Kafka", "RabbitMQ",
    "Apache Pulsar", "ActiveMQ", "Artemis",
    "Amazon SQS", "Amazon SNS",
    "Google Pub/Sub", "Azure Service Bus",
    "NATS", "ZeroMQ", "Redis Streams",
    "Redpanda", "Apache Flink",
    "Amazon Kinesis", "Debezium",
    "Change Data Capture", "CDC",

    // ================= DATA ENGINEERING & ETL =================
    "Apache Spark", "Spark", "PySpark",
    "Apache Hadoop", "Hadoop", "Hive",
    "Apache Airflow", "Airflow",
    "Dagster", "Prefect", "Luigi",
    "dbt", "Fivetran", "Airbyte",
    "Meltano", "Informatica", "Talend",
    "Apache NiFi", "AWS Glue",
    "Azure Data Factory", "Google Dataflow",
    "Apache Beam", "Kafka Connect",
    "Flink", "Dataform", "Matillion",
    "SSIS", "SSRS", "SSAS",
    "Pentaho", "IBM DataStage",
    "ETL", "ELT", "Data Pipelines",
    "Data Modeling", "Data Governance",
    "Data Quality", "Data Catalog",

    // ================= DATA SCIENCE =================
    "NumPy", "Pandas", "Polars",
    "SciPy", "Statsmodels", "Dask",
    "Xarray", "Jupyter", "Jupyter Notebook",
    "JupyterLab", "Google Colab",
    "Matplotlib", "Seaborn", "Plotly",
    "Bokeh", "Altair", "Streamlit",
    "Dash", "Gradio", "Shiny",
    "Apache Arrow", "Vaex",
    "Data Analysis", "Statistical Analysis",
    "Exploratory Data Analysis", "EDA",
    "Feature Engineering", "A/B Testing",
    "Hypothesis Testing", "Time Series Analysis",

    // ================= MACHINE LEARNING =================
    "Machine Learning", "Deep Learning",
    "Artificial Intelligence", "AI", "ML",
    "Supervised Learning", "Unsupervised Learning",
    "Reinforcement Learning", "Scikit-learn",
    "scikit-learn", "XGBoost", "LightGBM",
    "CatBoost", "Statsmodels",
    "TensorFlow", "Keras", "PyTorch",
    "JAX", "MXNet", "ONNX",
    "Hugging Face", "Transformers",
    "Sentence Transformers", "spaCy", "NLTK",
    "Gensim", "OpenCV", "MediaPipe",
    "YOLO", "Detectron2", "Ultralytics",
    "MLflow", "Kubeflow", "DVC",
    "Weights & Biases", "WandB",
    "ClearML", "Neptune.ai", "Feast",
    "BentoML", "KServe", "Seldon",
    "Ray", "Ray Serve", "TorchServe",
    "TensorRT", "OpenVINO", "Triton Inference Server",
    "Model Deployment", "MLOps",
    "Computer Vision", "Natural Language Processing",
    "NLP", "Speech Recognition", "Recommendation Systems",

    // ================= GENERATIVE AI & LLM =================
    "Generative AI", "GenAI", "LLM",
    "Large Language Models", "Prompt Engineering",
    "Retrieval-Augmented Generation", "RAG",
    "Fine-Tuning", "LoRA", "QLoRA",
    "PEFT", "RLHF", "Agentic AI",
    "AI Agents", "Multi-Agent Systems",
    "LangChain", "LangGraph", "LlamaIndex",
    "Haystack", "Semantic Kernel",
    "AutoGen", "CrewAI", "DSPy",
    "Ollama", "vLLM", "llama.cpp",
    "LiteLLM", "LM Studio",
    "OpenAI API", "Azure OpenAI",
    "Anthropic API", "Claude",
    "Google Gemini", "Gemini API",
    "Hugging Face Inference",
    "Amazon Bedrock", "Vertex AI",
    "Vector Databases", "Vector Search",
    "Pinecone", "Weaviate", "Qdrant",
    "Milvus", "ChromaDB", "Chroma",
    "FAISS", "LanceDB", "pgvector",
    "Embeddings", "Semantic Search",
    "Reranking", "Guardrails AI",
    "Promptfoo", "Ragas", "DeepEval",
    "LLM Evaluation", "AI Safety",

    // ================= BUSINESS INTELLIGENCE & VISUALIZATION =================
    "Power BI", "Tableau", "Looker",
    "Looker Studio", "Microsoft Excel",
    "Excel", "Google Sheets", "Qlik Sense",
    "QlikView", "MicroStrategy",
    "Apache Superset", "Metabase",
    "Grafana", "Kibana", "Redash",
    "FineBI", "Sigma Computing",
    "Domo", "ThoughtSpot",
    "DAX", "Power Query", "MDX",
    "SSRS", "Crystal Reports",

    // ================= MOBILE DEVELOPMENT =================
    "Android", "Android SDK", "iOS",
    "SwiftUI", "UIKit", "Jetpack Compose",
    "Kotlin Multiplatform", "KMM",
    "React Native", "Expo",
    "Flutter", "Xamarin", ".NET MAUI",
    "Ionic", "Capacitor", "NativeScript",
    "Cordova", "PhoneGap", "Unity",
    "Unreal Engine", "Godot",
    "Appium", "Fastlane", "TestFlight",
    "Google Play Console", "Xcode",
    "Android Studio",

    // ================= TESTING & QA =================
    "Jest", "Vitest", "Mocha", "Chai",
    "Jasmine", "Karma", "Cypress",
    "Playwright", "Puppeteer",
    "Selenium", "WebdriverIO",
    "Testing Library", "React Testing Library",
    "Enzyme", "Storybook Test Runner",
    "JUnit", "TestNG", "Mockito",
    "WireMock", "REST Assured",
    "Pytest", "unittest", "Robot Framework",
    "Behave", "Cucumber", "SpecFlow",
    "NUnit", "xUnit", "MSTest",
    "PHPUnit", "Pest PHP", "RSpec",
    "Capybara", "JMeter", "Gatling",
    "k6", "Locust", "Artillery",
    "Postman Testing", "Newman",
    "SoapUI", "TestComplete",
    "BrowserStack", "Sauce Labs",
    "LambdaTest", "Percy", "Applitools",
    "Unit Testing", "Integration Testing",
    "End-to-End Testing", "E2E Testing",
    "Regression Testing", "Performance Testing",
    "Load Testing", "Stress Testing",
    "Contract Testing", "TDD", "BDD",
    "Test Automation", "Quality Assurance",

    // ================= SECURITY & IDENTITY =================
    "Cybersecurity", "Application Security",
    "Information Security", "DevSecOps",
    "OWASP", "OWASP Top 10",
    "Penetration Testing", "Vulnerability Assessment",
    "SAST", "DAST", "IAST", "SCA",
    "SonarQube", "SonarCloud",
    "Snyk", "Dependabot", "Trivy",
    "Checkmarx", "Veracode", "Semgrep",
    "Burp Suite", "OWASP ZAP",
    "Nessus", "Nmap", "Metasploit",
    "HashiCorp Vault", "Vault",
    "Keycloak", "Auth0", "Okta",
    "OAuth 2.0", "OpenID Connect",
    "JWT", "JSON Web Tokens",
    "SAML", "LDAP", "Active Directory",
    "RBAC", "ABAC", "IAM",
    "Zero Trust", "SIEM",
    "Microsoft Sentinel", "Splunk Enterprise Security",
    "Wazuh", "CrowdStrike", "Falco",
    "Encryption", "PKI", "TLS",

    // ================= OBSERVABILITY & MONITORING =================
    "Prometheus", "Grafana", "Datadog",
    "New Relic", "Dynatrace", "AppDynamics",
    "Elastic Stack", "ELK Stack",
    "OpenTelemetry", "Jaeger", "Zipkin",
    "Loki", "Tempo", "Fluentd",
    "Fluent Bit", "Vector",
    "Sentry", "Bugsnag", "Rollbar",
    "PagerDuty", "Opsgenie",
    "Splunk", "Nagios", "Zabbix",
    "Checkmk", "Icinga",
    "CloudWatch", "Azure Monitor",
    "Application Insights", "Honeycomb",
    "Incident Management", "SRE",
    "Site Reliability Engineering",
    "Distributed Tracing", "Log Management",

    // ================= VERSION CONTROL & COLLABORATION =================
    "Git", "GitHub", "GitLab", "Bitbucket",
    "Azure Repos", "Subversion", "SVN",
    "Mercurial", "Perforce",
    "GitHub Copilot", "CodeRabbit",
    "Jira", "Confluence", "Linear",
    "Trello", "Asana", "Notion",
    "Slack", "Microsoft Teams",
    "Agile", "Scrum", "Kanban",
    "SAFe", "Jira Software",

    // ================= CMS, E-COMMERCE & LOW-CODE =================
    "WordPress", "Drupal", "Joomla",
    "Strapi", "Directus", "Contentful",
    "Sanity", "Storyblok", "Prismic",
    "Ghost CMS", "Payload CMS",
    "Shopify", "Magento", "Adobe Commerce",
    "WooCommerce", "BigCommerce",
    "Salesforce Commerce Cloud",
    "Salesforce", "Salesforce Apex",
    "Salesforce Lightning",
    "ServiceNow", "SAP",
    "SAP ABAP", "SAP Fiori",
    "Mendix", "OutSystems", "Appian",
    "Microsoft Power Apps",
    "Microsoft Power Automate",
    "Retool", "Budibase", "ToolJet",

    // ================= BLOCKCHAIN & WEB3 =================
    "Blockchain", "Ethereum", "Solana",
    "Web3", "Smart Contracts",
    "Solidity", "Hardhat", "Foundry",
    "Truffle", "Ethers.js", "ethers.js",
    "Web3.js", "Wagmi", "Viem",
    "IPFS", "Polygon", "Hyperledger Fabric",
    "Chainlink", "The Graph",
    "Rust Blockchain Development",

    // ================= GAME DEVELOPMENT & GRAPHICS =================
    "Unity", "Unreal Engine", "Godot",
    "Cocos2d", "Phaser", "Three.js",
    "Babylon.js", "WebGL", "WebGPU",
    "OpenGL", "Vulkan", "DirectX",
    "Blender", "Maya", "3ds Max",
    "Houdini", "Substance Painter",

    // ================= ROBOTICS & IOT =================
    "ROS", "ROS 2", "Robot Operating System",
    "Arduino", "Raspberry Pi", "ESP32",
    "Embedded C", "Embedded C++",
    "FreeRTOS", "Zephyr RTOS",
    "PlatformIO", "MQTT", "CoAP",
    "Modbus", "OPC UA", "CAN Bus",
    "Edge Computing", "TinyML",
    "Gazebo", "MoveIt", "PX4",
    "MATLAB Simulink", "LabVIEW",

    // ================= ENTERPRISE & INTEGRATION =================
    "Apache Camel", "MuleSoft", "Mule ESB",
    "Dell Boomi", "Workato", "SnapLogic",
    "WSO2", "IBM App Connect",
    "IBM MQ", "TIBCO", "BizTalk",
    "Apache OFBiz", "Camunda",
    "Temporal", "Netflix Conductor",
    "Power Platform", "Microsoft Graph API",

    // ================= OTHER TOOLS & TECHNOLOGIES =================
    "Apache Maven", "Maven", "Gradle",
    "Ant", "Make", "CMake", "Ninja",
    "MSBuild", "NuGet", "Composer",
    "Pip", "Poetry", "Pipenv", "Conda",
    "Virtualenv", "uv",
    "OpenTelemetry Collector",
    "Apache ZooKeeper", "ZooKeeper",
    "Apache Oozie", "Apache Ranger",
    "Apache Atlas", "Apache Kudu",
    "Apache Cassandra", "Cassandra",
    "ScyllaDB", "InfluxDB", "TimescaleDB",
    "PromQL", "LogQL", "SQLAlchemy",
    "Prisma", "Drizzle ORM", "Sequelize",
    "TypeORM", "Mongoose", "Knex.js",
    "Entity Framework Core", "Dapper",
    "JPA", "JDBC", "MyBatis",
    "Flyway", "Liquibase",
    "OpenAPI Generator", "Buf",
    "Protocol Buffers", "Protobuf",
    "Apache Thrift", "Cap'n Proto"
];

    const techStack = knownSkills.filter((skill) => {
        const escaped = skill.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        return new RegExp(
            `(^|[^a-zA-Z0-9+#.])${escaped}(?=$|[^a-zA-Z0-9+#.])`,
            "i"
        ).test(cleanText);
    });

    return {
        fullName,
        email,
        phone,
        techStack: techStack.join(", "),
    };
};

const handleResumeUpload = async (file) => {
    if (!file) return;

    setIsParsing(true);
    setResumeName(file.name);

    try {
        const text = await extractResumeText(file);

        if (!text.trim()) {
            throw new Error(
                "No readable text found. This may be a scanned PDF."
            );
        }

        const details = parseResumeDetails(text);
        const filenameName = getNameFromFilename(file.name);

        setForm((previous) => ({
            ...previous,
            fullName: details.fullName || filenameName || previous.fullName,
            email: details.email || previous.email,
            phone: details.phone || previous.phone,
            techStack: details.techStack || previous.techStack,
        }));

        const extractedCount = [
            details.fullName || filenameName,
            details.email,
            details.phone,
            details.techStack,
        ].filter(Boolean).length;

        if (extractedCount > 0) {
            toast.success(
                `Resume processed. Found ${extractedCount} of 4 fields. Please review the details.`
            );
        } else {
            toast.warning(
                "Resume text was read, but no profile details were detected."
            );
        }
    } catch (error) {
        console.error("Resume parsing failed:", error);
        toast.error(
            error.message || "Unable to process the resume."
        );
        setResumeName("");
    } finally {
        setIsParsing(false);
    }
};

const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleResumeUpload(file);
};

const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) handleResumeUpload(file);

    // Allow selecting the same file again.
    event.target.value = "";
};

    return (
        <div className="dashboard-page">

            {/* NAVBAR */}

            <header className="dashboard-navbar">

                <div className="brand">
                    <div className="brand-logo">
                        K
                    </div>

                    <div>
                        <h2>Krack-AI</h2>
                        <span>Profile Manager</span>
                    </div>
                </div>

                <div className="nav-user">

                    <div className="user-info">
                        <div className="avatar">
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                        </div>

                        <div>
                            <strong>
                                {user.firstName} {user.lastName}
                            </strong>

                            <span>
                                {user.email}
                            </span>
                        </div>
                    </div>

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* MAIN */}

            <main className="dashboard-content">

                {/* PAGE TITLE */}

                <div className="page-heading">

                    <div>
                        <h1>
                            Dashboard
                        </h1>

                        <p>
                            Manage your profile submissions and track your activity.
                        </p>
                    </div>

                </div>


                {/* STAT CARDS */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon purple">
                            #
                        </div>

                        <div className="stat-content">

                            <span>
                                Total Profiles
                            </span>

                            <h2>
                                {stats.totalCount}
                            </h2>

                            <small>
                                All time submissions
                            </small>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon green">
                            ✓
                        </div>

                        <div className="stat-content">

                            <span>
                                Today's Submissions
                            </span>

                            <h2>
                                {todayCount}
                            </h2>

                            <small>
                                Submitted today
                            </small>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon blue">
                            📅
                        </div>

                        <div className="stat-content">

                            <span>
                                Selected Date
                            </span>

                            <h2>
                                {selectedDate
                                    ? selectedDateCount
                                    : "--"
                                }
                            </h2>

                            <small>
                                {selectedDate
                                    ? selectedDate
                                    : "Choose a date below"
                                }
                            </small>

                        </div>

                    </div>

                </section>


                {/* FORM */}

                <section className="content-card">

                    <div className="card-header">

                        <div>

                            <h2>
                                Submit Profile
                            </h2>

                            <p>
                                Enter the candidate details below.
                            </p>

                        </div>

                    </div>


                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >
                        
<div
    className={`resume-dropzone ${isDragging ? "dragging" : ""} ${
        resumeName && !isParsing ? "has-file" : ""
    }`}
    onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
    }}
    onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
        }
    }}
    onDrop={handleDrop}
>
    <input
        id="resume-upload"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        disabled={isParsing}
        hidden
    />

    {/* Upload illustration */}
    <div className="upload-illustration">
        <div className="upload-icon-circle">
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path
                    d="M32 43V19M22 29L32 19L42 29"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M18 43H14C8.5 43 5 39 5 33.5C5 28.5 8.5 24.5 13.5 24C15.5 14 23 8 32 8C42 8 49.5 15 50.5 24.5C56 25 60 29.5 60 35C60 40 56 43 50 43H46"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    </div>

    {/* Upload instructions */}
    <div className="upload-content">
        <h3>
            {isParsing
                ? "Analyzing your resume..."
                : "Upload your resume"}
        </h3>

        <p>
            Drag and drop your PDF or DOCX file here,
            or click to browse
        </p>

        <div className="upload-actions">
            <label
                htmlFor="resume-upload"
                className={`resume-browse-button ${
                    isParsing ? "disabled" : ""
                }`}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10L12 7H18.5A2.5 2.5 0 0 1 21 9.5V17A2 2 0 0 1 19 19H5A2 2 0 0 1 3 17V7.5Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                    />
                </svg>

                {isParsing ? "Please wait..." : "Browse files"}
            </label>

            <span className="upload-file-hint">
                PDF or DOCX <span>·</span> Maximum 5 MB
            </span>
        </div>
    </div>

    {/* Selected file status */}
    <div className="upload-file-panel">
        {resumeName ? (
            <>
                <div className="selected-file">
                    <div className="file-type-icon">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                d="M6 2.75H14L19 7.75V20A1.25 1.25 0 0 1 17.75 21.25H6A1.25 1.25 0 0 1 4.75 20V4A1.25 1.25 0 0 1 6 2.75Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            />
                            <path
                                d="M14 2.75V8H19M8 13H16M8 16.5H14"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div className="selected-file-info">
                        <strong title={resumeName}>{resumeName}</strong>
                        <span>
                            {isParsing
                                ? "Extracting information..."
                                : "Resume selected"}
                        </span>
                    </div>
                </div>

                {!isParsing && (
                    <div className="upload-success">
                        <span className="success-check">✓</span>
                        <span>Resume ready to process</span>
                    </div>
                )}
            </>
        ) : (
            <div className="upload-empty-state">
                <div className="empty-file-icon">PDF</div>
                <strong>No resume selected</strong>
                <span>Your file details will appear here</span>
            </div>
        )}
    </div>
</div>


                        <div className="form-row">

                            <div className="form-field">

                                <label>
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    required
                                />

                            </div>


                            <div className="form-field">

                                <label>
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="Enter email address"
                                    required
                                />

                            </div>

                        </div>


                        <div className="form-row">

                            <div className="form-field">

                                <label>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    required
                                />

                            </div>


                            <div className="form-field">

                                <label>
                                    Tech Stack
                                </label>

                                <input
                                    type="text"
                                    name="techStack"
                                    value={form.techStack}
                                    onChange={handleChange}
                                    placeholder="React, Node.js, JavaScript"
                                    required
                                />

                            </div>

                        </div>


                        <div className="form-actions">

                            <button
                                type="submit"
                                className="submit-button"
                            >
                                Submit Profile
                            </button>

                        </div>

                    </form>

                </section>


                {/* HISTORY */}

                <section className="content-card">

                    <div className="history-header">

                        <div>

                            <h2>
                                Submission History
                            </h2>

                            <p>
                                View your profile submission activity.
                            </p>

                        </div>


                        <div className="date-filter">

                            <label>
                                Filter by date
                            </label>

                            <div className="date-controls">

                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                />

                                {selectedDate && (
                                    <button
                                        onClick={() =>
                                            setSelectedDate("")
                                        }
                                    >
                                        Clear
                                    </button>
                                )}

                            </div>

                        </div>

                    </div>


                    <div className="table-wrapper">

                        <table className="history-table">

                            <thead>

                                <tr>
                                    <th>Date</th>
                                    <th>Profiles Submitted</th>
                                </tr>

                            </thead>

                            <tbody>

                                {stats.dailyStats
                                    .filter(item =>
                                        !selectedDate ||
                                        item.date === selectedDate
                                    )
                                    .map(item => (

                                        <tr key={item.date}>

                                            <td>
                                                {new Date(
                                                    item.date + "T00:00:00"
                                                ).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric"
                                                    }
                                                )}
                                            </td>

                                            <td>

                                                <span className="count-badge">
                                                    {item.count}
                                                </span>

                                            </td>

                                        </tr>

                                    ))}


                                {stats.dailyStats.filter(item =>
                                    !selectedDate ||
                                    item.date === selectedDate
                                ).length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="2"
                                            className="empty-state"
                                        >
                                            No submissions found.
                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Dashboard;